import jwt from 'jsonwebtoken';
import User from '../../models/User';
import { env } from '../../config/environment';
import { ApiError } from '../../utils/response';

export class AuthService {
  async login(email: string, password: string) {
    const user = await User.findOne({ email: email.toLowerCase() }).populate('departmentId', 'name code');
    if (!user) throw new ApiError('Invalid email or password.', 401);
    if (user.status !== 'ACTIVE') throw new ApiError('Your account has been deactivated. Contact the administrator.', 403);
    const bcrypt = await import('bcryptjs');
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) throw new ApiError('Invalid email or password.', 401);
    const token = jwt.sign(
      { id: user._id, role: user.role, departmentId: user.departmentId },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn } as any
    );
    const userObj: any = user.toObject();
    delete userObj.passwordHash;
    return { token, user: userObj };
  }

  async me(userId: string) {
    const user = await User.findById(userId).populate('departmentId', 'name code').select('-passwordHash');
    if (!user) throw new ApiError('User not found.', 404);
    return user;
  }
}
