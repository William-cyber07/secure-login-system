import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

const backupDir = path.join(process.cwd(), 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

export async function backupDatabase(req, res) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${timestamp}.sql`;
    const filePath = path.join(backupDir, filename);

    // Get the mysql bin path from .env, fallback to just 'mysqldump' if not set
    const binPath = process.env.MYSQL_BIN_PATH 
      ? `"${path.join(process.env.MYSQL_BIN_PATH, 'mysqldump.exe')}"` 
      : 'mysqldump';

    const cmd = `${binPath} -u ${process.env.DB_USER} -p${process.env.DB_PASSWORD} ${process.env.DB_NAME} > "${filePath}"`;

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error('Backup error:', error);
        return res.status(500).json({ error: 'Backup failed', details: error.message });
      }
      return res.json({ 
        message: 'Database backed up successfully', 
        filename 
      });
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}

export async function restoreDatabase(req, res) {
  try {
    const { filename } = req.body;
    if (!filename || !filename.endsWith('.sql')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filePath = path.join(backupDir, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }

    const binPath = process.env.MYSQL_BIN_PATH 
      ? `"${path.join(process.env.MYSQL_BIN_PATH, 'mysql.exe')}"` 
      : 'mysql';

    const cmd = `${binPath} -u ${process.env.DB_USER} -p${process.env.DB_PASSWORD} ${process.env.DB_NAME} < "${filePath}"`;

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error('Restore error:', error);
        return res.status(500).json({ error: 'Restore failed', details: error.message });
      }
      return res.json({ message: 'Database restored successfully' });
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}