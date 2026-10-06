/**
 * Merge duplicate open chat conversations per customer, then rebuild ChatRoom
 * indexes (the unique "one open room per customer" index can't be built while
 * duplicates exist).
 *
 *   npm run fix-chat-rooms            # preview only
 *   npm run fix-chat-rooms -- --apply # make the changes
 */
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import ChatRoom from "../models/ChatRoom";
import { planOpenRoomDedupe, applyOpenRoomDedupe } from "../services/chatMaintenance";

const run = async () => {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
    const apply = process.argv.includes("--apply");
    await mongoose.connect(process.env.MONGODB_URI);

    const plans = await planOpenRoomDedupe();
    if (plans.length === 0) {
        console.log("No duplicate open conversations.");
    }
    for (const plan of plans) {
        const extras = plan.merge.map((m) => `${m.roomId} (${m.messages} messages)`).join(", ");
        console.log(`Customer ${plan.customerId}: keep ${plan.keep}; merge and remove ${extras}`);
    }

    if (!apply) {
        console.log("\nPreview only. Run with --apply to make these changes.");
    } else {
        const removed = await applyOpenRoomDedupe(plans);
        console.log(`Removed ${removed} duplicate conversation(s).`);
        await ChatRoom.syncIndexes();
        const names = (await ChatRoom.collection.indexes()).map((i) => i.name);
        console.log(`Chat room indexes: ${names.join(", ")}`);
    }

    await mongoose.disconnect();
};

run().catch(async (error) => {
    console.error("Chat room repair failed:", error);
    await mongoose.disconnect();
    process.exit(1);
});
