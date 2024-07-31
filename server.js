const express = require('express')
const bodyParser = require('body-parser')
const booksrouter = require('./router/books')
const usersRouter = require('./router/users')
const cors = require('cors')
const path = require('path')
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
const db = require('./services/database')

const JWT_SECRET = "HelloThereImObiWan"
function authenticateToken(req, res, next) {
    const token = req.cookies.token
    if (!token) return res.sendStatus(401)

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403)
        req.user = user
        next()
    })
}

 // Start of Selection
const corsOptions = {
    origin: ['https://exam.andragogy.fr', 'http://localhost:3000', 'http://localhost:5173'], // Ajout de l'origine localhost
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
}

const router = express.Router()
router.use(bodyParser.json());
router.use(cors(corsOptions));
router.use(cookieParser());
router.use('/api/books', booksrouter);
router.use('/api/users', usersRouter);

router.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Déconnexion réussie' });
});

router.get('/api/session', authenticateToken, (req, res) => {
    if (req?.user) {
        res.json({ user: req.user });
    } else {
        res.status(401).json({ message: 'Non authentifié' });
    }
});

router.get('/api/statistics', (req, res) => {
    const totalBooksQuery = 'SELECT COUNT(*) AS total_books FROM livres';
    const totalUsersQuery = 'SELECT COUNT(*) AS total_users FROM utilisateurs';

    db.query(totalBooksQuery, (err, booksResult) => {
        if (err) throw err;
        db.query(totalUsersQuery, (err, usersResult) => {
            if (err) throw err;
            res.json({
                total_books: booksResult[0].total_books,
                total_users: usersResult[0].total_users
            });
        });
    });
});

router.post('/api/emprunt', authenticateToken, (req, res) => {
    console.log(req.body);
    const  book_id  = req.body.book_id;
    const user_id = req.body.user_id;
    const currentDateTime = new Date();
    const dateRetourPrevue = new Date(currentDateTime);
    dateRetourPrevue.setDate(dateRetourPrevue.getDate() + 30);
      // Mettre à jour le statut du livre
      db.query('UPDATE livres SET statut = "emprunté" WHERE id = ?', [book_id], (err, updateResult) => {
        if (err) {
            console.error("Erreur lors de la mise à jour du statut du livre:", err);
            res.status(500).json({ message: 'Erreur lors de la mise à jour du statut du livre' });
        } else {
            console.log("Statut du livre mis à jour avec succès");
        }
    });

    db.query('INSERT INTO emprunts (id_utilisateur, id_livre,date_emprunt,date_retour_prevue) VALUES (?, ?,?,?)', [user_id, book_id,currentDateTime,dateRetourPrevue], (err, result) => {
        if (err) throw err;
        res.json({ message: 'Emprunt réussi' });
    });
  
});
router.post('/api/empruntes', authenticateToken, (req, res) => {
    const user_id = req.user.id;
    db.query('SELECT * FROM emprunts WHERE id_utilisateur = ?', [user_id], (err, result) => {
        if (err) throw err;
        res.json(result);
    });
});
router.post('/api/retour', authenticateToken, (req, res) => {
    const book_id = req.body.book_id;
    const user_id = req.body.user_id;
    db.query('DELETE FROM emprunts WHERE id_livre = ? AND id_utilisateur = ?', [book_id, user_id], (err, result) => {
        if (err) throw err;
        res.json({ message: 'Retour réussi' });
    });
    db.query('UPDATE livres SET statut = "disponible" WHERE id = ?', [book_id], (err, updateResult) => {
        if (err) {
            console.error("Erreur lors de la mise à jour du statut du livre:", err);
            res.status(500).json({ message: 'Erreur lors de la mise à jour du statut du livre' });
        } else {
            console.log("Statut du livre mis à jour avec succès");
        }
    });
});
router.use('/', express.static(path.join(__dirname, "./webpub")))
router.use(express.static(path.join(__dirname, "./webpub")))
router.use('/*', (_, res) => {
    res.sendFile(
        path.join(__dirname, "./webpub/index.html")
    );
})
router.get("*", (_, res) => {
    res.sendFile(
        path.join(__dirname, "./webpub/index.html")
    );
});

module.exports = router;