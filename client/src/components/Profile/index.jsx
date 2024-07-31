
import React, { useState, useEffect } from 'react';
import './styles.css';
const base = import.meta.env.VITE_BASE_URL || '/';

const Profile = () => {
    const [books, setBooks] = useState([]);
    const [booksEmpruntes, setBooksEmpruntes] = useState([]);
    const [error, setError] = useState('');
    const [user, setUser] = useState(null);
    const [empruntesDatas, setEmpruntesDatas] = useState([]);
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Vérification du JWT
                const sessionResponse = await fetch(base + 'api/session', {
                    credentials: 'include'
                });
                
                if (sessionResponse.status === 401) {
                    throw new Error('Non authentifié');
                }
                
                const sessionData = await sessionResponse.json();
                setUser(sessionData.user);
                
                // Récupérer les livres empruntés
                const empruntesResponse = await fetch(base + 'api/empruntes', {
                    method: 'POST',
                    credentials: 'include',
                    body: JSON.stringify({user_id: sessionData.user.id}),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                const empruntesData = await empruntesResponse.json();
           
                console.log(booksEmpruntes);
                setEmpruntesDatas(empruntesData);
                // Récupération des livres disponibles
                const booksResponse = await fetch(base + 'api/books', {
                    credentials: 'include'
                });
                const booksData = await booksResponse.json();
                
                if (Array.isArray(booksData)) {
                    const livresDisponibles = booksData.filter(livre => livre.statut === 'disponible');
                    const livresEmpruntes = booksData.filter(livre => empruntesData.some(emprunt => emprunt.id_livre === livre.id));
                    setBooks(livresDisponibles);
                    setBooksEmpruntes(livresEmpruntes);
                } else {
                    console.error('Les données reçues ne sont pas un tableau');
                }
            } catch (err) {
                setError(err.message || "Erreur d'authentification. Veuillez vous reconnecter.");
                console.error('Erreur:', err);
            }
        };

        fetchData();
    }, []);

    // Vérification des dates de retour prévues
    useEffect(() => {
        const aujourdhui = new Date();
        empruntesDatas.forEach(emprunt => {
            const dateRetourPrevue = new Date(emprunt.date_retour_prevue);
            if (dateRetourPrevue <= aujourdhui) {
                alert(`Attention : Le livre avec l'ID ${emprunt.id_livre} a atteint ou dépassé sa date de retour prévue.`);
            }
        });
    }, []);

   
    
    function emprunt(bookId, userId) {
        fetch(base + 'api/emprunt', {
            method: 'POST',
            credentials: 'include',
            body: JSON.stringify({ book_id: bookId, user_id: userId }),
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            console.log('Emprunt réussi:', data);
                // Rafraîchir les données après l'emprunt
                setBooks(prevBooks => prevBooks.filter(book => book.id !== bookId));
                setBooksEmpruntes(prevBooksEmpruntes => [...prevBooksEmpruntes, books.find(book => book.id === bookId)]);
                setEmpruntesDatas(prevEmpruntesDatas => [...prevEmpruntesDatas, { id_livre: bookId, date_emprunt: new Date(), date_retour_prevue: new Date(new Date().setDate(new Date().getDate() + 30)) }]);
        })
        .catch(err => console.error('Erreur d\'emprunt:', err));
    }
    function retournerLivre(bookId, userId) {
        fetch(base + 'api/retour', {
            method: 'POST',
            credentials: 'include',
            body: JSON.stringify({ book_id: bookId, user_id: userId }),
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            console.log('Retour réussi:', data);
            // Rafraîchir les données après le retour du livre
            // Rafraîchir les données après le retour du livre
            setBooksEmpruntes(prevBooksEmpruntes => prevBooksEmpruntes.filter(book => book.id !== bookId));
            setBooks(prevBooks => [...prevBooks, booksEmpruntes.find(book => book.id === bookId)]);
            setEmpruntesDatas(prevEmpruntesDatas => prevEmpruntesDatas.filter(emprunt => emprunt.id_livre !== bookId));
        })
        .catch(err => console.error('Erreur de retour:', err));
    }
    return (
        <div className="profile-container">
            <div className="book-section">
                <h2 className="section-title">Livres disponibles</h2>
                <ul className="book-list">
                    {books?.map((book, index) => (
                        <li key={index} className="book-item">
                            <span className="book-title">{book.titre}</span>
                            <button className="borrow-button action-button" onClick={() => emprunt(book.id, user.id)}>Emprunter</button>
                        </li>
                    ))}
                </ul>
            </div>
            
            <div className="book-section">
                <h2 className="section-title">Livres empruntés</h2>
                <ul className="book-list">
                    {booksEmpruntes?.map((book, index) => (
                        <li key={index} className="book-item borrowed-book">
                            <span className="book-title">{book.titre}</span>
                            {empruntesDatas?.find(emprunt => emprunt.id_livre === book.id) && (
                                <div className="borrow-details">
                                    <span className="borrow-date">Emprunté le : {new Date(empruntesDatas.find(emprunt => emprunt.id_livre === book.id).date_emprunt).toLocaleDateString()}</span>
                                    <span className="return-date">, Date de retour prévue : {new Date(empruntesDatas.find(emprunt => emprunt.id_livre === book.id).date_retour_prevue).toLocaleDateString()}</span>
                                </div>
                            )}
                            <button className="return-button action-button" onClick={() => retournerLivre(book.id, user.id)}>Retourner le livre</button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default Profile;
