const { Client } = require('pg');

const NEON_CONFIG = {
  connectionString: 'postgresql://neondb_owner:npg_t3Lp4rzePYQl@ep-mute-mode-ap6f7pjw-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
};

let client = null;
let isConnecting = false;

async function getDbClient() {
  if (client && !client._closed) {
    try {
      await client.query('SELECT 1');
      return client;
    } catch (e) {
      // Connection lost, will reconnect below
      client = null;
    }
  }
  
  if (isConnecting) {
    // Wait for existing connection attempt
    await new Promise(resolve => setTimeout(resolve, 1000));
    return getDbClient();
  }
  
  isConnecting = true;
  try {
    client = new Client(NEON_CONFIG);
    
    // Handle connection errors
    client.on('error', (err) => {
      console.error('Neon database error:', err.message);
      client = null;
    });
    
    await client.connect();
    return client;
  } finally {
    isConnecting = false;
  }
}

async function closeDb() {
  if (client) {
    try {
      await client.end();
    } catch (e) {
      // Ignore errors on close
    }
    client = null;
  }
}

async function initSchema() {
  const db = await getDbClient();
  
  await db.query(`
    CREATE TABLE IF NOT EXISTS plugins (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(50) DEFAULT 'feature',
      author VARCHAR(255),
      keywords TEXT,
      download_link TEXT,
      md_content TEXT,
      version VARCHAR(20) DEFAULT '1.0.0',
      github_repo VARCHAR(255),
      github_owner VARCHAR(255),
      github_branch VARCHAR(50) DEFAULT 'main',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      published BOOLEAN DEFAULT FALSE,
      downloads INTEGER DEFAULT 0,
      rating DECIMAL(3,2) DEFAULT 0
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS plugin_ratings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      plugin_id UUID REFERENCES plugins(id) ON DELETE CASCADE,
      user_id VARCHAR(255),
      rating INTEGER CHECK (rating >= 1 AND rating <= 5),
      review TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS plugin_downloads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      plugin_id UUID REFERENCES plugins(id) ON DELETE CASCADE,
      downloaded_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_plugins_category ON plugins(category);
    CREATE INDEX IF NOT EXISTS idx_plugins_published ON plugins(published);
    CREATE INDEX IF NOT EXISTS idx_plugins_created ON plugins(created_at DESC);
  `);

  // Google auth users table
  await db.query(`
    CREATE TABLE IF NOT EXISTS google_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      display_name VARCHAR(255),
      picture TEXT,
      access_token TEXT,
      refresh_token TEXT,
      token_expiry TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_google_users_email ON google_users(email);
  `);
}

async function createPlugin(data) {
  const db = await getDbClient();
  const result = await db.query(
    `INSERT INTO plugins (name, description, category, author, keywords, download_link, md_content, github_repo, github_owner, github_branch)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [data.name, data.description, data.category, data.author, data.keywords, data.download_link, data.md_content, data.github_repo, data.github_owner, data.github_branch || 'main']
  );
  return result.rows[0];
}

async function getPlugins(filters = {}) {
  const db = await getDbClient();
  let query = 'SELECT * FROM plugins WHERE published = TRUE';
  const params = [];
  let paramIndex = 1;

  if (filters.category) {
    query += ` AND category = $${paramIndex++}`;
    params.push(filters.category);
  }

  if (filters.search) {
    query += ` AND (name ILIKE $${paramIndex++} OR description ILIKE $${paramIndex++} OR keywords ILIKE $${paramIndex++})`;
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  query += ' ORDER BY created_at DESC';

  if (filters.limit) {
    query += ` LIMIT $${paramIndex++}`;
    params.push(filters.limit);
  }

  const result = await db.query(query, params);
  return result.rows;
}

async function getPluginById(id) {
  const db = await getDbClient();
  const result = await db.query('SELECT * FROM plugins WHERE id = $1', [id]);
  return result.rows[0];
}

async function updatePlugin(id, data) {
  const db = await getDbClient();
  const fields = Object.keys(data).filter(k => k !== 'id');
  const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  
  const values = [id, ...fields.map(f => data[f])];
  const result = await db.query(
    `UPDATE plugins SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    values
  );
  return result.rows[0];
}

async function deletePlugin(id) {
  const db = await getDbClient();
  await db.query('DELETE FROM plugins WHERE id = $1', [id]);
}

async function ratePlugin(pluginId, userId, rating, review) {
  const db = await getDbClient();
  await db.query(
    `INSERT INTO plugin_ratings (plugin_id, user_id, rating, review)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (plugin_id, user_id) DO UPDATE SET rating = $3, review = $4`,
    [pluginId, userId, rating, review]
  );
  
  const avgResult = await db.query(
    'SELECT AVG(rating) as avg_rating FROM plugin_ratings WHERE plugin_id = $1',
    [pluginId]
  );
  
  await db.query(
    'UPDATE plugins SET rating = $1 WHERE id = $2',
    [avgResult.rows[0].avg_rating || 0, pluginId]
  );
}

async function trackDownload(pluginId) {
  const db = await getDbClient();
  await db.query('INSERT INTO plugin_downloads (plugin_id) VALUES ($1)', [pluginId]);
  await db.query('UPDATE plugins SET downloads = downloads + 1 WHERE id = $1', [pluginId]);
}

async function testConnection() {
  try {
    const db = await getDbClient();
    await db.query('SELECT 1');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function saveGoogleUser(userInfo) {
  const db = await getDbClient();
  const result = await db.query(`
    INSERT INTO google_users (email, display_name, picture, access_token, refresh_token, token_expiry)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (email) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      picture = EXCLUDED.picture,
      access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      token_expiry = EXCLUDED.token_expiry,
      updated_at = NOW()
    RETURNING id, email, display_name, picture, created_at, updated_at
  `, [userInfo.email, userInfo.display_name, userInfo.picture, userInfo.access_token, userInfo.refresh_token, userInfo.token_expiry]);
  return result.rows[0];
}

async function getGoogleUser(email) {
  const db = await getDbClient();
  const result = await db.query('SELECT id, email, display_name, picture, created_at, updated_at FROM google_users WHERE email = $1', [email]);
  return result.rows[0] || null;
}

module.exports = {
  initSchema,
  getDbClient,
  closeDb,
  createPlugin,
  getPlugins,
  getPluginById,
  updatePlugin,
  deletePlugin,
  ratePlugin,
  trackDownload,
  testConnection,
  saveGoogleUser,
  getGoogleUser
};
