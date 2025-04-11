import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { storage } from '../storage';
import { InsertUser, InsertSession, User, Login, UserLog, Role } from '@shared/schema';

// Số lượng vòng băm cho bcrypt
const SALT_ROUNDS = 10;

// Thời gian token hết hạn (7 ngày)
const TOKEN_EXPIRES_IN = '7d';

// JWT secret key - nên đặt vào biến môi trường
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-need-to-be-changed';

class AuthService {
  /**
   * Mã hóa mật khẩu
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * So sánh mật khẩu đã nhập với mật khẩu đã băm
   */
  async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Tạo JWT token
   */
  generateToken(user: User): string {
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
  }

  /**
   * Xác thực token JWT
   */
  verifyToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  /**
   * Tạo session token
   */
  generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Đăng ký người dùng mới
   */
  async registerUser(userData: InsertUser): Promise<User | null> {
    try {
      // Kiểm tra xem username đã tồn tại chưa
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return null; // Người dùng đã tồn tại
      }

      // Mã hóa mật khẩu
      const hashedPassword = await this.hashPassword(userData.password);

      // Tạo người dùng mới
      const newUser = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      return newUser;
    } catch (error) {
      console.error('Lỗi khi đăng ký người dùng:', error);
      return null;
    }
  }

  /**
   * Đăng nhập
   */
  async login(loginData: Login, ipAddress?: string, userAgent?: string): Promise<{ user: User, token: string } | null> {
    try {
      // Lấy thông tin người dùng
      const user = await storage.getUserByUsername(loginData.username);
      if (!user) {
        return null; // Người dùng không tồn tại
      }

      // Kiểm tra mật khẩu
      const isPasswordValid = await this.comparePassword(loginData.password, user.password);
      if (!isPasswordValid) {
        return null; // Mật khẩu không đúng
      }

      // Kiểm tra trạng thái tài khoản
      if (!user.isActive) {
        return null; // Tài khoản bị khóa
      }

      // Tạo JWT token
      const token = this.generateToken(user);

      // Tạo phiên đăng nhập
      const session: InsertSession = {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 ngày
        ipAddress,
        userAgent,
      };

      await storage.createSession(session);

      // Cập nhật thời gian đăng nhập cuối cùng
      await storage.updateUser(user.id, { lastLogin: new Date() });

      // Ghi log đăng nhập
      await this.logUserActivity(user.id, 'LOGIN', 'user', user.id, 'Đăng nhập thành công', ipAddress);

      return { user, token };
    } catch (error) {
      console.error('Lỗi khi đăng nhập:', error);
      return null;
    }
  }

  /**
   * Đăng xuất
   */
  async logout(userId: number, token: string, ipAddress?: string): Promise<boolean> {
    try {
      // Xóa phiên đăng nhập
      const success = await storage.deleteSession(token);
      
      // Ghi log đăng xuất
      if (success) {
        await this.logUserActivity(userId, 'LOGOUT', 'user', userId, 'Đăng xuất thành công', ipAddress);
      }

      return success;
    } catch (error) {
      console.error('Lỗi khi đăng xuất:', error);
      return false;
    }
  }

  /**
   * Xác thực người dùng từ token
   */
  async validateUser(token: string): Promise<User | null> {
    try {
      // Verify token
      const decoded = this.verifyToken(token);
      if (!decoded) {
        return null;
      }

      // Lấy thông tin người dùng từ token
      const user = await storage.getUser(decoded.id);
      if (!user || !user.isActive) {
        return null;
      }

      // Kiểm tra xem token có tồn tại trong database không
      const session = await storage.getSessionByToken(token);
      if (!session) {
        return null;
      }

      // Kiểm tra xem phiên đã hết hạn chưa
      if (new Date(session.expiresAt) < new Date()) {
        await storage.deleteSession(token);
        return null;
      }

      return user;
    } catch (error) {
      console.error('Lỗi khi xác thực người dùng:', error);
      return null;
    }
  }

  /**
   * Kiểm tra quyền truy cập
   */
  hasPermission(userRole: Role, requiredRole: Role): boolean {
    const roles: Role[] = ['viewer', 'operator', 'admin'];
    const userRoleIndex = roles.indexOf(userRole);
    const requiredRoleIndex = roles.indexOf(requiredRole);
    
    // Người dùng có quyền cao hơn hoặc bằng quyền yêu cầu
    return userRoleIndex >= requiredRoleIndex;
  }

  /**
   * Ghi log hoạt động người dùng
   */
  async logUserActivity(
    userId: number,
    action: string,
    target?: string,
    targetId?: number,
    details?: string,
    ipAddress?: string
  ): Promise<UserLog | null> {
    try {
      const logData: any = {
        userId,
        action,
        target,
        targetId,
        details,
        ipAddress
      };

      return await storage.createUserLog(logData);
    } catch (error) {
      console.error('Lỗi khi ghi log hoạt động:', error);
      return null;
    }
  }
}

export const authService = new AuthService();