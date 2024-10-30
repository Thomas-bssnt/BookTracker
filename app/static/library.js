const API_ENDPOINTS = {
    CREATE_BOOK: '/api/books',
    READ_BOOK: (bookId) => `/api/books/${bookId}`,
    UPDATE_BOOK: (bookId) => `/api/books/${bookId}`,
    UPDATE_BOOK_STATUS: (bookId) => `/api/books/${bookId}/status`,
    DELETE_BOOK: (bookId) => `/api/books/${bookId}`,
};

// DOM elements

const modal = document.getElementById('bookModal');
const bookForm = document.getElementById('bookForm');
const addBookButton = document.getElementById('addBookButton');
const editBookButton = document.getElementById('editBookButton');
const deleteBookButton = document.getElementById('deleteBookButton');
const closeModalButton = modal.querySelector('.close');

// Utility functions

const toggleModal = (show) => {
    modal.style.display = show ? 'block' : 'none';
};

const toggleModalMode = (mode) => {
    const modes = ['viewMode', 'formMode'];
    modes.forEach(m =>
        document.getElementById(m).style.display = m === mode ? 'block' : 'none'
    );
};

const updateModalWithBookData = (data) => {
    const fields = ['title', 'author_last', 'author_first', 'series', 'volume', 'year', 'language', 'genre', 'isbn'];
    fields.forEach(field => {
        document.getElementById(`viewMode-${field}`).textContent = data[field];
        document.getElementById(`formMode-${field}`).value = data[field];
    });
    deleteBookButton.dataset.bookId = data['id'];
    editBookButton.dataset.bookId = data['id'];
    bookForm.dataset.bookId = data['id'];
};

// API calls

const fetchBookData = async (bookId) => {
    const response = await fetch(API_ENDPOINTS.READ_BOOK(bookId), {
        method: 'GET',
    });

    const responseData = await response.json();
    if (responseData.status === 'fail' || responseData.status === 'error') {
        throw new Error(responseData.data.error || responseData.message);
    }

    return responseData.data.book;
};

const submitBookForm = async (formData, mode, bookId) => {
    const url = mode === 'add' ? API_ENDPOINTS.CREATE_BOOK : API_ENDPOINTS.UPDATE_BOOK(bookId);
    const method = mode === 'add' ? 'POST' : 'PUT';
    const response = await fetch(url, {
        method: method,
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: formData,
    });

    const responseData = await response.json();
    if (responseData.status === 'fail' || responseData.status === 'error') {
        throw new Error(responseData.data.error || responseData.message);
    }

    return responseData.data;
};

const deleteBook = async (bookId) => {
    const response = await fetch(API_ENDPOINTS.DELETE_BOOK(bookId), {
        method: 'DELETE',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    });

    const responseData = await response.json();
    if (responseData.status === 'fail' || responseData.status === 'error') {
        throw new Error(responseData.data.error || responseData.message);
    }
};

const editStatus = async (bookId, status) => {
    const response = await fetch(API_ENDPOINTS.UPDATE_BOOK_STATUS(bookId), {
        method: 'PATCH',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: `status=${status}`,
    });

    const responseData = await response.json();
    if (responseData.status === 'fail' || responseData.status === 'error') {
        throw new Error(responseData.data.error || responseData.message);
    }
};

// Event handlers

const handleRowClick = async (row) => {
    const bookId = row.dataset.bookId;
    try {
        const data = await fetchBookData(bookId);
        toggleModal(true);
        toggleModalMode('viewMode');
        updateModalWithBookData(data);
    } catch (error) {
        console.error('Error fetching book data:', error);
    }
};

const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new URLSearchParams(new FormData(event.target));
    const mode = document.getElementById('formModeInput').value;
    const bookId = bookForm.dataset.bookId;
    try {
        const data = await submitBookForm(formData, mode, bookId);
        console.log(data);
        if (data.message) {
            toggleModal(false);
            location.reload();
        } else {
            console.warn(`Error in ${mode} mode:`, data.error);
        }
    } catch (error) {
        console.error('An unexpected error occurred:', error);
    }
};

const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce livre ?')) return;
    try {
        const bookId = deleteBookButton.dataset.bookId;
        await deleteBook(bookId);
        toggleModal(false);
        location.reload();
    } catch (error) {
        console.error('An unexpected error occurred while deleting the book:', error);
    }
};

const handleChangeBookStatus = async (button) => {
    const row = button.closest('.book-row');
    const bookId = row.getAttribute('data-book-id');

    const currentStatus = button.getAttribute('data-current-status');

    let newStatus;
    switch (currentStatus) {
        case 'not_read':
            newStatus = 'reading';
            break;
        case 'reading':
            newStatus = 'read';
            break;
        case 'read':
            newStatus = 'not_read';
            break;
        default:
            newStatus = 'reading';
    }

    try {
        await editStatus(bookId, newStatus);
        button.setAttribute('data-current-status', newStatus);

        // Update the button icon based on the new status
        if (newStatus === 'read') {
            button.innerHTML = '<i class="fa-solid fa-check"></i>';
        } else if (newStatus === 'reading') {
            button.innerHTML = '<i class="fa-solid fa-minus"></i>';
        } else {
            button.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        }
    } catch (error) {
        console.error('An unexpected error occurred while changing the book status:', error);
    }
};

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.book-row').forEach(row => {
        row.addEventListener('click', () => handleRowClick(row));
    });

    document.querySelectorAll('.book-row button').forEach(button => {
        button.addEventListener('click', (event) => {
            event.stopPropagation(); // This prevents the event from bubbling up to the row
            handleChangeBookStatus(button);
        });
    });

    deleteBookButton.addEventListener('click', handleDelete);

    bookForm.addEventListener('submit', handleSubmit);

    editBookButton.addEventListener('click', () => {
        toggleModalMode('formMode');
        document.getElementById('formModeInput').value = 'edit';
    });

    addBookButton.addEventListener('click', () => {
        toggleModal(true);
        bookForm.reset();
        toggleModalMode('formMode');
        document.getElementById('formModeInput').value = 'add';
    });

    closeModalButton.addEventListener('click', () => toggleModal(false));

    window.onclick = (event) => {
        if (event.target === modal) {
            toggleModal(false);
        }
    };
});
