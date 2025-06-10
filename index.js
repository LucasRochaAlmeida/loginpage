const express = require('express');
const path = require('path');
const session = require('express-session');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const app = express();

app.use(express.static(path.join(__dirname, 'src'))); // Serve arquivos estáticos da pasta src
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'segredo_simples',
    resave: false,
    saveUninitialized: false
}));

// Conexão com o MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'loginpage'
});

// Crie a tabela se não existir
db.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario VARCHAR(50) UNIQUE,
        senha VARCHAR(255)
    )
`);

// Página inicial
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: path.join(__dirname, 'src') });
});

// Cadastro de usuário com bcrypt
app.post('/register', async (req, res) => {
    const { novoUsuario, novaSenha } = req.body;
    try {
        // Verifica se o usuário já existe
        db.query('SELECT * FROM usuarios WHERE usuario = ?', [novoUsuario], async (err, results) => {
            if (results && results.length > 0) {
                return res.send('<script>alert("Usuário já existe!");window.location="/";</script>');
            }
            // Se não existe, cadastra normalmente
            const hash = await bcrypt.hash(novaSenha, 10);
            db.query('INSERT INTO usuarios (usuario, senha) VALUES (?, ?)', [novoUsuario, hash], (err) => {
                if (err) {
                    return res.send('<script>alert("Erro no cadastro.");window.location="/";</script>');
                }
                res.send('<script>alert("Usuário cadastrado com sucesso!");window.location="/";</script>');
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
                return res.redirect('/dashboard');
            }
        }
        res.send('<script>alert("Usuário ou senha incorretos.");window.location="/";</script>');
    });
});

// Protege a rota do dashboard
app.get('/dashboard', (req, res) => {
    if (req.session.autenticado) {
        res.sendFile('dashboard.html', { root: path.join(__dirname, 'src') });
    } else {
        res.redirect('/');
    }
});

app.listen(3000, () => {
    console.log('Servidor rodando em http://localhost:3000');
});