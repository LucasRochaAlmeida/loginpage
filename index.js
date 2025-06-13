const express = require('express');
const path = require('path');
const session = require('express-session');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const app = express();
const fs = require('fs');

app.use(express.static(path.join(__dirname, 'src'))); // Serve arquivos estáticos da pasta src
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: 'segredo_simples',
    resave: false,
    saveUninitialized: false
}));

// Conexão com o MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Xk2ag47HQ4luca$',
    database: 'loginpage'
});

// Crie a tabela se não existir
db.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario VARCHAR(50) UNIQUE,
        senha VARCHAR(255),
        cpf VARCHAR(14) UNIQUE,
        tipo ENUM('comum','admin') DEFAULT 'comum'
    )
`);

// Página inicial
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: path.join(__dirname, 'src') });
});

// Cadastro de usuário com bcrypt e CPF criptografado
app.post('/register', async (req, res) => {
    const { novoUsuario, novaSenha, cpf, tipo } = req.body;
    try {
        db.query('SELECT * FROM usuarios WHERE usuario = ?', [novoUsuario], async (err, results) => {
            if (results && results.length > 0) {
                return res.send('<script>alert("Usuário já existe!");window.location="/";</script>');
            }
            db.query('SELECT * FROM usuarios WHERE cpf = ?', [cpf], async (err, results) => {
                if (results && results.length > 0) {
                    return res.send('<script>alert("CPF já cadastrado!");window.location="/";</script>');
                }
                const hashSenha = await bcrypt.hash(novaSenha, 10);
                db.query(
                    'INSERT INTO usuarios (usuario, senha, cpf, tipo) VALUES (?, ?, ?, ?)',
                    [novoUsuario, hashSenha, cpf, tipo],
                    (err) => {
                        if (err) {
                            return res.send('<script>alert("Erro no cadastro.");window.location="/";</script>');
                        }
                        res.send('<script>alert("Usuário cadastrado com sucesso!");window.location="/";</script>');
                    }
                );
            });
        });
    } catch (error) {
        res.send('<script>alert("Erro ao cadastrar usuário.");window.location="/";</script>');
    }
});

// Login com bcrypt
app.post('/login', (req, res) => {
    const { usuario, senha } = req.body;
    db.query('SELECT * FROM usuarios WHERE usuario = ?', [usuario], async (err, results) => {
        if (results && results.length > 0) {
            const usuarioDB = results[0];
            const match = await bcrypt.compare(senha, usuarioDB.senha);
            if (match) {
                req.session.autenticado = true;
                req.session.usuario = usuarioDB.usuario;
                req.session.tipo = usuarioDB.tipo; // Salva o tipo na sessão
                return res.redirect('/dashboard');
            }
        }
        res.send('<script>alert("Usuário ou senha incorretos.");window.location="/";</script>');
    });
});

// Exemplo com EJS
app.get('/dashboard', (req, res) => {
    if (req.session.autenticado) {
        fs.readFile(path.join(__dirname, 'src', 'dashboard.html'), 'utf8', (err, data) => {
            if (err) return res.status(500).send('Erro');
            const html = data.replace('TIPO_USUARIO', req.session.tipo);
            res.send(html);
        });
    } else {
        res.redirect('/');
    }
});

function isAdmin(req, res, next) {
    if (req.session.tipo === 'admin') {
        return next();
    }
    res.status(403).send('Acesso negado: apenas administradores.');
}

app.get('/admin', isAdmin, (req, res) => {
    res.send('Bem-vindo, administrador!');
});

// Rota para buscar todos os agendamentos
app.get('/api/agendamentos', (req, res) => {
    db.query('SELECT * FROM agendamentos', (err, results) => {
        if (err) return res.status(500).json({ erro: 'Erro ao buscar agendamentos' });
        res.json(results);
    });
});

// Rota para agendar um horário
app.post('/api/agendar', (req, res) => {
    const { horario, nome, telefone } = req.body;
    db.query(
        'INSERT INTO agendamentos (horario, nome, telefone) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE nome=?, telefone=?',
        [horario, nome, telefone, nome, telefone],
        (err) => {
            if (err) return res.status(500).json({ erro: 'Erro ao agendar' });
            res.json({ sucesso: true });
        }
    );
});

// Rota para liberar um horário (apenas admin)
app.post('/api/liberar', (req, res) => {
    if (req.session.tipo !== 'admin') return res.status(403).json({ erro: 'Acesso negado' });
    const { horario } = req.body;
    db.query('UPDATE agendamentos SET nome=NULL, telefone=NULL WHERE horario=?', [horario], (err) => {
        if (err) return res.status(500).json({ erro: 'Erro ao liberar horário' });
        res.json({ sucesso: true });
    });
});

app.listen(3000, () => {
    console.log('Servidor rodando em http://localhost:3000');
});