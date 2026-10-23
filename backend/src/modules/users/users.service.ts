import bcrypt from 'bcryptjs';
import User from '../../models/User';
import Department from '../../models/Department';
import { ApiError } from '../../utils/response';

export class UsersService {
  async list(query: any) {
    const filter: any = {};
    if (query.role) filter.role = query.role;
    if (query.status) filter.status = query.status;
    if (query.search) filter.$or = [
      { name: new RegExp(query.search, 'i') },
      { email: new RegExp(query.search, 'i') },
    ];
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '10', 10)));
    const [items, total] = await Promise.all([
      User.find(filter).populate('departmentId', 'name code').select('-passwordHash')
        .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      User.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  async getById(id: string) {
    const user = await User.findById(id).populate('departmentId', 'name code').select('-passwordHash');
    if (!user) throw new ApiError('User not found.', 404);
    return user;
  }

  async create(data: any) {
    const existing = await User.findOne({ email: data.email.toLowerCase() });
    if (existing) throw new ApiError('A user with this email already exists.', 409);
    if (data.departmentId) {
      const dept = await Department.findById(data.departmentId);
      if (!dept) throw new ApiError('Selected department does not exist.', 400);
    }
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await User.create({
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash,
      role: data.role,
      departmentId: data.departmentId || null,
      status: data.status || 'ACTIVE',
    });
    return this.getById((user._id as any).toString());
  }

  async update(id: string, data: any, currentUserId: string) {
    const user = await User.findById(id);
    if (!user) throw new ApiError('User not found.', 404);
    if (data.email && data.email.toLowerCase() !== user.email) {
      const clash = await User.findOne({ email: data.email.toLowerCase() });
      if (clash) throw new ApiError('A user with this email already exists.', 409);
      user.email = data.email.toLowerCase();
    }
    if (data.password) user.passwordHash = await bcrypt.hash(data.password, 10);
    if (data.name) user.name = data.name;
    if (data.role) {
      if ((user._id as any).toString() === currentUserId && user.role === 'ADMIN' && data.role !== 'ADMIN') {
        throw new ApiError('You cannot remove your own ADMIN role.', 400);
      }
      user.role = data.role;
    }
    if (data.departmentId !== undefined) user.departmentId = data.departmentId || null;
    if (data.status) {
      if ((user._id as any).toString() === currentUserId && data.status === 'INACTIVE') {
        throw new ApiError('You cannot deactivate your own account.', 400);
      }
      user.status = data.status;
    }
    await user.save();
    return this.getById(id);
  }

  async remove(id: string, currentUserId: string) {
    if (id === currentUserId) throw new ApiError('You cannot delete your own account.', 400);
    const user = await User.findByIdAndDelete(id);
    if (!user) throw new ApiError('User not found.', 404);
    return { deleted: true };
  }
}
