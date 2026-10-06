/**
 * Chat data maintenance
 */
import ChatRoom from "../models/ChatRoom";
import Message from "../models/Message";

export interface DuplicateRoomPlan {
    customerId: string;
    keep: string;
    merge: { roomId: string; messages: number }[];
}

/**
 * Find customers with more than one open conversation (possible before the
 * "one open room per customer" index existed). The room with the most recent
 * message is kept (empty rooms never win over rooms with messages; ties go to
 * the oldest room); the others are merged into it.
 */
export const planOpenRoomDedupe = async (): Promise<DuplicateRoomPlan[]> => {
    const groups = await ChatRoom.aggregate<{
        _id: unknown;
        rooms: { _id: unknown; lastMessageAt?: Date; createdAt: Date }[];
    }>([
        { $match: { status: "open", customerId: { $type: "objectId" } } },
        {
            $group: {
                _id: "$customerId",
                rooms: { $push: { _id: "$_id", lastMessageAt: "$lastMessageAt", createdAt: "$createdAt" } },
                count: { $sum: 1 },
            },
        },
        { $match: { count: { $gt: 1 } } },
    ]);

    const plans: DuplicateRoomPlan[] = [];
    for (const group of groups) {
        const time = (d?: Date) => (d ? new Date(d).getTime() : 0);
        const rooms = [...group.rooms].sort(
            (a, b) =>
                time(b.lastMessageAt) - time(a.lastMessageAt) || time(a.createdAt) - time(b.createdAt),
        );
        const [keep, ...rest] = rooms;
        plans.push({
            customerId: String(group._id),
            keep: String(keep._id),
            merge: await Promise.all(
                rest.map(async (room) => ({
                    roomId: String(room._id),
                    messages: await Message.countDocuments({ roomId: String(room._id) }),
                })),
            ),
        });
    }
    return plans;
};

/** Merge duplicate open rooms per the plan: move messages and unread counts, delete extras */
export const applyOpenRoomDedupe = async (plans: DuplicateRoomPlan[]): Promise<number> => {
    let removed = 0;
    for (const plan of plans) {
        for (const extra of plan.merge) {
            const room = await ChatRoom.findById(extra.roomId);
            if (!room || room.status !== "open") continue;

            if (extra.messages > 0) {
                await Message.updateMany({ roomId: room._id }, { $set: { roomId: plan.keep } });
                await ChatRoom.updateOne(
                    { _id: plan.keep },
                    { $inc: { unreadCountAdmin: room.unreadCountAdmin, unreadCountCustomer: room.unreadCountCustomer } },
                );
            }
            await room.deleteOne();
            removed++;
        }
    }
    return removed;
};
