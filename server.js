const express = require('express');
const multer = require('multer');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do banco de dados
const db = new sqlite3.Database('./db/plantas.db', (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite');
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.run(`
        CREATE TABLE IF NOT EXISTS plants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            scientificName TEXT,
            description TEXT NOT NULL,
            benefits TEXT NOT NULL,
            preparation TEXT NOT NULL,
            image TEXT,
            references TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plantId INTEGER NOT NULL,
            filename TEXT NOT NULL,
            originalname TEXT NOT NULL,
            mimetype TEXT NOT NULL,
            size INTEGER NOT NULL,
            path TEXT NOT NULL,
            FOREIGN KEY (plantId) REFERENCES plants(id) ON DELETE CASCADE
        )
    `);
}

// Configuração do Multer para upload de arquivos
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadDir = './uploads';
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir);
            }
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueSuffix + path.extname(file.originalname));
        }
    }),
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos PDF e Word são permitidos'));
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Rotas da API
app.get('/api/plants', (req, res) => {
    db.all(`
        SELECT p.*, 
               (SELECT GROUP_CONCAT(f.filename, '|') FROM files f WHERE f.plantId = p.id) as fileNames,
               (SELECT GROUP_CONCAT(f.originalname, '|') FROM files f WHERE f.plantId = p.id) as originalNames
        FROM plants p
        ORDER BY p.createdAt DESC
    `, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        const plants = rows.map(row => {
            const files = [];
            if (row.fileNames && row.originalNames) {
                const filenames = row.fileNames.split('|');
                const originalnames = row.originalNames.split('|');
                
                for (let i = 0; i < filenames.length; i++) {
                    if (filenames[i] && originalnames[i]) {
                        files.push({
                            filename: filenames[i],
                            originalname: originalnames[i]
                        });
                    }
                }
            }
            
            return {
                id: row.id,
                name: row.name,
                scientificName: row.scientificName,
                description: row.description,
                benefits: row.benefits,
                preparation: row.preparation,
                image: row.image,
                references: row.references,
                createdAt: row.createdAt,
                files: files
            };
        });
        
        res.json(plants);
    });
});

app.get('/api/plants/:id', (req, res) => {
    const plantId = req.params.id;
    
    db.get(`
        SELECT p.* 
        FROM plants p
        WHERE p.id = ?
    `, [plantId], (err, plant) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (!plant) {
            return res.status(404).json({ error: 'Planta não encontrada' });
        }
        
        db.all(`
            SELECT filename, originalname 
            FROM files 
            WHERE plantId = ?
        `, [plantId], (err, files) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            res.json({
                ...plant,
                files: files
            });
        });
    });
});

app.post('/api/plants', upload.array('files'), (req, res) => {
    const { name, scientificName, description, benefits, preparation, image, references } = req.body;
    
    if (!name || !description || !benefits || !preparation) {
        return res.status(400).json({ error: 'Nome, descrição, benefícios e modo de preparo são obrigatórios' });
    }
    
    db.run(`
        INSERT INTO plants (name, scientificName, description, benefits, preparation, image, references)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [name, scientificName, description, benefits, preparation, image, references], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        const plantId = this.lastID;
        
        // Salvar informações dos arquivos
        if (req.files && req.files.length > 0) {
            const stmt = db.prepare(`
                INSERT INTO files (plantId, filename, originalname, mimetype, size, path)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            
            req.files.forEach(file => {
                stmt.run([
                    plantId,
                    file.filename,
                    file.originalname,
                    file.mimetype,
                    file.size,
                    file.path
                ]);
            });
            
            stmt.finalize();
        }
        
        res.status(201).json({ id: plantId, message: 'Planta criada com sucesso' });
    });
});

app.put('/api/plants/:id', upload.array('files'), (req, res) => {
    const plantId = req.params.id;
    const { name, scientificName, description, benefits, preparation, image, references } = req.body;
    
    if (!name || !description || !benefits || !preparation) {
        return res.status(400).json({ error: 'Nome, descrição, benefícios e modo de preparo são obrigatórios' });
    }
    
    db.run(`
        UPDATE plants 
        SET name = ?, 
            scientificName = ?, 
            description = ?, 
            benefits = ?, 
            preparation = ?, 
            image = ?, 
            references = ?,
            updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
    `, [name, scientificName, description, benefits, preparation, image, references, plantId], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Planta não encontrada' });
        }
        
        // Salvar informações dos novos arquivos
        if (req.files && req.files.length > 0) {
            const stmt = db.prepare(`
                INSERT INTO files (plantId, filename, originalname, mimetype, size, path)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            
            req.files.forEach(file => {
                stmt.run([
                    plantId,
                    file.filename,
                    file.originalname,
                    file.mimetype,
                    file.size,
                    file.path
                ]);
            });
            
            stmt.finalize();
        }
        
        res.json({ message: 'Planta atualizada com sucesso' });
    });
});

app.delete('/api/plants/:id', (req, res) => {
    const plantId = req.params.id;
    
    // Primeiro, obter informações dos arquivos para excluí-los do sistema de arquivos
    db.all('SELECT filename FROM files WHERE plantId = ?', [plantId], (err, files) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        // Excluir arquivos do sistema de arquivos
        files.forEach(file => {
            const filePath = path.join(__dirname, 'uploads', file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });
        
        // Agora excluir a planta e seus arquivos do banco de dados
        db.run('DELETE FROM plants WHERE id = ?', [plantId], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Planta não encontrada' });
            }
            
            res.json({ message: 'Planta excluída com sucesso' });
        });
    });
});

app.get('/api/plants/search', (req, res) => {
    const query = req.query.q;
    
    if (!query) {
        return res.status(400).json({ error: 'Parâmetro de busca não fornecido' });
    }
    
    const searchTerm = `%${query}%`;
    
    db.all(`
        SELECT * FROM plants 
        WHERE name LIKE ? OR scientificName LIKE ? OR description LIKE ? OR benefits LIKE ?
        ORDER BY name
    `, [searchTerm, searchTerm, searchTerm, searchTerm], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json(rows);
    });
});

// Rota para servir o frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

// Lidar com encerramento adequado
process.on('SIGINT', () => {
    db.close();
    process.exit();
});
