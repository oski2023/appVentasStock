import bcrypt from 'bcryptjs';
import { pool } from '../../db/index.js';
import { LoginInput, SeedAdminInput } from './auth.schemas.js';

export interface UserSession {
  id: string;
  nombre: string;
  email: string;
  role: string;
  estado: boolean;
}

export class AuthService {
  /**
   * Autentica un usuario con email y contraseña, verificando estado activo y obteniendo su rol.
   */
  static async login(input: LoginInput): Promise<UserSession | null> {
    const query = `
      SELECT u.id, u.nombre, u.email, u.password_hash, u.estado, r.nombre AS role
      FROM users u
      INNER JOIN roles r ON u.role_id = r.id
      WHERE LOWER(u.email) = LOWER($1)
    `;

    const { rows } = await pool.query(query, [input.email]);
    if (rows.length === 0) {
      return null;
    }

    const user = rows[0];

    // Verificar si el usuario está activo
    if (!user.estado) {
      throw new Error('El usuario se encuentra inactivo. Contacte al administrador.');
    }

    // Verificar contraseña con bcrypt
    const passwordMatch = await bcrypt.compare(input.password, user.password_hash);
    if (!passwordMatch) {
      return null;
    }

    return {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      role: user.role,
      estado: user.estado,
    };
  }

  /**
   * Obtiene los datos del usuario por ID
   */
  static async getUserById(userId: string): Promise<UserSession | null> {
    const query = `
      SELECT u.id, u.nombre, u.email, u.estado, r.nombre AS role
      FROM users u
      INNER JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
    `;

    const { rows } = await pool.query(query, [userId]);
    if (rows.length === 0) {
      return null;
    }

    const user = rows[0];
    return {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      role: user.role,
      estado: user.estado,
    };
  }

  /**
   * Si no hay ningún usuario en la base de datos, permite crear el primer administrador.
   */
  static async seedAdmin(input: SeedAdminInput): Promise<UserSession> {
    const countResult = await pool.query('SELECT COUNT(*) AS total FROM users');
    const totalUsers = parseInt(countResult.rows[0].total, 10);

    if (totalUsers > 0) {
      throw new Error('Ya existen usuarios registrados en el sistema. El semillado inicial está bloqueado.');
    }

    // Buscar rol 'admin'
    const roleResult = await pool.query("SELECT id FROM roles WHERE nombre = 'admin'");
    if (roleResult.rows.length === 0) {
      throw new Error("El rol 'admin' no existe en la base de datos. Ejecute las migraciones primero.");
    }
    const adminRoleId = roleResult.rows[0].id;

    // Hashear contraseña con bcrypt (cost factor 10)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.password, salt);

    const insertQuery = `
      INSERT INTO users (nombre, email, password_hash, role_id, estado)
      VALUES ($1, LOWER($2), $3, $4, true)
      RETURNING id, nombre, email, estado
    `;

    const { rows } = await pool.query(insertQuery, [
      input.nombre,
      input.email,
      passwordHash,
      adminRoleId,
    ]);

    const newUser = rows[0];
    return {
      id: newUser.id,
      nombre: newUser.nombre,
      email: newUser.email,
      role: 'admin',
      estado: newUser.estado,
    };
  }
}
