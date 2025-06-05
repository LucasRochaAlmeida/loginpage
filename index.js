const express = require('express');
const path = require('path');
const session = require('express-session');
const app = express();

app.use(express.static(path.join(__dirname, 'src'))); // Serve arquivos estáticos da pasta src
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'segredo_simples',
    resave: false,
    saveUninitialized: false
}));

// Página inicial
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: path.join(__dirname, 'src') });
});

// Login (POST)
app.post('/login', (req, res) => {
    const { usuario, senha } = req.body;
    if (usuario === 'admin' && senha === '1234') {
        req.session.autenticado = true;
        res.redirect('/dashboard');
    } else {
        res.send('<script>alert("Usuário ou senha incorretos.");window.location="/";</script>');
    }
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