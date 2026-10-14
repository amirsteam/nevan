/**
 * Account Controller
 * Profile details and the delivery address book of the signed-in user
 */
import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import AppError from "../utils/AppError";
import User, { MAX_ADDRESSES } from "../models/User";
import { canonicalDistrict, PROVINCE_NAMES } from "../utils/nepal";

const ADDRESS_FIELDS = ["label", "name", "phone", "street", "city", "district", "province", "landmark"] as const;

const pickAddress = (body: Record<string, unknown>) => {
  const address: Record<string, unknown> = {};
  for (const field of ADDRESS_FIELDS) {
    if (body[field] !== undefined) address[field] = body[field];
  }
  return address;
};

/**
 * The district must be in the province (it decides the shipping rate); store
 * its standard spelling. Checked after merging, so editing only one of the two
 * is checked against the other.
 */
const checkDistrict = (address: { province?: unknown; district?: unknown }) => {
  const province = Number(address.province);
  const district = canonicalDistrict(province, String(address.district ?? ""));
  if (!district) {
    const name = PROVINCE_NAMES[province];
    throw new AppError(
      name ? `"${address.district}" isn't a district in ${name} Province. Choose one of its districts.` : "Choose a province, then a district",
      400,
    );
  }
  address.district = district;
};

const loadUser = async (req: Request) => {
  const user = await User.findById((req.user as any)._id);
  if (!user) throw new AppError("User not found", 404);
  return user;
};

/** Default address first, then newest */
const sortedAddresses = (user: any) =>
  [...user.addresses].sort((a: any, b: any) => Number(b.isDefault) - Number(a.isDefault));

/**
 * @desc    Update name / phone
 * @route   PUT /api/v1/auth/me
 * @access  Private
 */
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await loadUser(req);
  if (req.body.name !== undefined) user.name = req.body.name;
  if (req.body.phone !== undefined) user.phone = req.body.phone || undefined;
  await user.save();

  res.status(200).json({
    status: "success",
    message: "Profile updated",
    data: {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        createdAt: (user as any).createdAt,
      },
    },
  });
});

/**
 * @desc    Saved delivery addresses
 * @route   GET /api/v1/auth/addresses
 * @access  Private
 */
export const getAddresses = asyncHandler(async (req: Request, res: Response) => {
  const user = await loadUser(req);
  res.status(200).json({ status: "success", data: { addresses: sortedAddresses(user) } });
});

/**
 * @desc    Save a delivery address (the first one becomes the default)
 * @route   POST /api/v1/auth/addresses
 * @access  Private
 */
export const addAddress = asyncHandler(async (req: Request, res: Response) => {
  const user = await loadUser(req);
  if (user.addresses.length >= MAX_ADDRESSES) {
    throw new AppError(`You can save up to ${MAX_ADDRESSES} addresses. Remove one to add another.`, 400);
  }

  const makeDefault = req.body.isDefault === true || user.addresses.length === 0;
  if (makeDefault) user.addresses.forEach((a: any) => (a.isDefault = false));
  const address = pickAddress(req.body);
  checkDistrict(address);
  user.addresses.push({ ...address, isDefault: makeDefault } as any);
  await user.save();

  const created = user.addresses[user.addresses.length - 1];
  res.status(201).json({
    status: "success",
    message: "Address saved",
    data: { address: created, addresses: sortedAddresses(user) },
  });
});

/**
 * @desc    Edit an address, or make it the default
 * @route   PUT /api/v1/auth/addresses/:addressId
 * @access  Private
 */
export const updateAddress = asyncHandler(async (req: Request, res: Response) => {
  const user = await loadUser(req);
  const address = user.addresses.id(req.params.addressId as string);
  if (!address) throw new AppError("Address not found", 404);

  const changes = pickAddress(req.body);
  if (changes.district !== undefined || changes.province !== undefined) {
    const merged = { province: changes.province ?? address.province, district: changes.district ?? address.district };
    checkDistrict(merged);
    Object.assign(changes, merged);
  }
  Object.assign(address, changes);
  if (req.body.isDefault === true) {
    user.addresses.forEach((a: any) => (a.isDefault = String(a._id) === String(address._id)));
  }
  await user.save();

  res.status(200).json({ status: "success", message: "Address updated", data: { address, addresses: sortedAddresses(user) } });
});

/**
 * @desc    Remove an address (the next one becomes the default)
 * @route   DELETE /api/v1/auth/addresses/:addressId
 * @access  Private
 */
export const deleteAddress = asyncHandler(async (req: Request, res: Response) => {
  const user = await loadUser(req);
  const address = user.addresses.id(req.params.addressId as string);
  if (!address) throw new AppError("Address not found", 404);

  const wasDefault = address.isDefault;
  address.deleteOne();
  if (wasDefault && user.addresses.length > 0) user.addresses[0].isDefault = true;
  await user.save();

  res.status(200).json({ status: "success", message: "Address removed", data: { addresses: sortedAddresses(user) } });
});
