import bcrypt from 'bcryptjs';
import { pool } from '../src/db/index.js';

async function setupUsers() {
  try {
    const password = 'password123';
    const hash = await bcrypt.hash(password, 10);

    // 1. Asegurar o actualizar admin@local.com
    const adminCheck = await pool.query("SELECT id FROM users WHERE email = 'admin@local.com'");
    const roleAdmin = await pool.query("SELECT id FROM roles WHERE nombre = 'admin'");
    const roleAdminId = roleAdmin.rows[0].id;

    if (adminCheck.rows.length === 0) {
      await pool.query(
        "INSERT INTO users (nombre, email, password_hash, role_id, estado) VALUES ($1, $2, $3, $4, true)",
        ['Administrador', 'admin@local.com', hash, roleAdminId]
      );
      console.log('Creado usuario admin@local.com');
    } else {
      await pool.query(
        "UPDATE users SET password_hash = $1, estado = true WHERE email = 'admin@local.com'",
        [hash]
      );
      console.log('Actualizado password de admin@local.com');
    }

    // Actualizar también marceloriquelme78@gmail.com con la misma contraseña por si la usa
    await pool.query(
      "UPDATE users SET password_hash = $1, estado = true WHERE email = 'marceloriquelme78@gmail.com'",
      [hash]
    );

    // 2. Asegurar usuario vendedor@local.com
    const vendedorCheck = await pool.query("SELECT id FROM users WHERE email = 'vendedor@local.com'");
    const roleVendedor = await pool.query("SELECT id FROM roles WHERE nombre = 'vendedor'");
    const roleVendedorId = roleVendedor.rows[0].id;

    if (vendedorCheck.rows.length === 0) {
      await pool.query(
        "INSERT INTO users (nombre, email, password_hash, role_id, estado) VALUES ($1, $2, $3, $4, true)",
        ['Vendedor Mostrador', 'vendedor@local.com', hash, roleVendedorId]
      );
      console.log('Creado usuario vendedor@local.com');
    } else {
      await pool.query(
        "UPDATE users SET password_hash = $1, estado = true WHERE email = 'vendedor@local.com'",
        [hash]
      );
      console.log('Actualizado password de vendedor@local.com');
    }

    // Listar usuarios resultantes
    const all = await pool.query(
      "SELECT u.id, u.nombre, u.email, r.nombre AS rol, u.estado FROM users u JOIN roles r ON u.role_id = r.id ORDER BY r.nombre ASC"
    );
    console.log('USUARIOS DISPONIBLES:\n', all.rows);

  } catch (err) {
    console.error('Error al configurar usuarios:', err);
  } finally {
    await pool.end();
  }
}

setupUsers();
