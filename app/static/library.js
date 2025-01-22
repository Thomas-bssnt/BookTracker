const API_ENDPOINTS = {
    CREATE_BOOK: '/api/books',
    READ_BOOK: (bookId) => `/api/books/${bookId}`,
    READ_BOOK_ISBN: (isbn) => `/api/books/isbn/${isbn}`,
    UPDATE_BOOK: (bookId) => `/api/books/${bookId}`,
    UPDATE_BOOK_STATUS: (bookId) => `/api/books/${bookId}/status`,
    DELETE_BOOK: (bookId) => `/api/books/${bookId}`,
};

// DOM elements

const viewBookModal = document.getElementById('viewBookModal');
const addEditBookModal = document.getElementById('addEditBookModal');
const bookForm = document.getElementById('bookForm');
const isbnForm = document.getElementById('isbnForm');
const editBookButton = document.getElementById('editBookButton');
const deleteBookButton = document.getElementById('deleteBookButton');
const isbnModal = document.getElementById("isbnModal");

// Utility functions

const updateModalWithBookData = (data) => {
    const fields = ['title', 'author_last', 'author_first', 'series', 'volume', 'year', 'language', 'genre', 'written_form', 'publisher', 'collection', 'isbn'];
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

const submitEditBookForm = async (formData, mode, bookId) => {
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
        openVisibility(viewBookModal);

        const data = await fetchBookData(bookId);
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
        const data = await submitEditBookForm(formData, mode, bookId);
        if (data.message) {
            closeVisibility(addEditBookModal);
            location.reload(); // TODO: dynamically update the page instead of reloading
        } else {
            console.warn(`Error in ${mode} mode:`, data.error);
        }
    } catch (error) {
        console.error('An unexpected error occurred:', error);
    }
};

const handleSubmitIsbnForm = async (event) => {

    event.preventDefault();
    const isbnInput = document.getElementById("isbnForm-isbn");
    const isbn = isbnInput.value.trim();

    try {
        const data = await submitIsbnForm(isbn);
        closeVisibility(isbnModal);
        openVisibility(addEditBookModal);
        bookForm.reset();
        updateModalWithBookData(data);
        document.getElementById('formModeInput').value = 'add';
    } catch (error) {
        console.error('An unexpected error occurred:', error);
    }
};

const submitIsbnForm = async (isbn) => {
    const response = await fetch(API_ENDPOINTS.READ_BOOK_ISBN(isbn), {method: "GET",});

    const responseData = await response.json();
    if (responseData.status === 'fail' || responseData.status === 'error') {
        throw new Error(responseData.data.error || responseData.message);
    }

    return responseData.data.book;
};


const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce livre ?')) return;
    try {
        const bookId = deleteBookButton.dataset.bookId;
        await deleteBook(bookId);

        closeVisibility(addEditBookModal);
        location.reload(); // TODO: dynamically update the page instead of reloading
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

// Modals and Dropdowns Visibility Control

function openVisibility(element) {
    element.classList.add("show");
}

function closeVisibility(element) {
    element.classList.remove("show");
}

function toggleVisibility(element) {
    element.classList.toggle("show");
}

// Event listeners

document.addEventListener('DOMContentLoaded', () => {
    // Dropdown Elements
    const addBookDropdown = document.getElementById("addBookDropdown");
    const addBookButton = document.getElementById('addBookButton');
    const manualAddButton = document.getElementById('manualAddButton');
    const isbnAddButton = document.getElementById('isbnAddButton');

    // Modal Elements
    const modals = document.querySelectorAll('.modal');

    // Event Listeners
    initializeDropdownListeners();
    initializeRowListeners();
    initializeModalListeners();
    initializeFormListeners();

    // Function Definitions

    // Dropdown Logic
    function initializeDropdownListeners() {
        addBookButton.addEventListener("click", (event) => {
            toggleVisibility(addBookDropdown);
        });

        document.addEventListener("click", (event) => {
            if (!addBookDropdown.contains(event.target) && !addBookButton.contains(event.target)) {
                closeVisibility(addBookDropdown);
            }
        });

        manualAddButton.addEventListener('click', (event) => {
            closeVisibility(addBookDropdown);
            openVisibility(addEditBookModal)

            document.getElementById('formModeInput').value = 'add';
        });

        isbnAddButton.addEventListener('click', (event) => {
            closeVisibility(addBookDropdown);
            openVisibility(isbnModal);
        });
    }

    // Table Row Logic
    function initializeRowListeners() {
        document.querySelectorAll('.book-row').forEach(row => {
            row.addEventListener('click', () => handleRowClick(row));
        });

        document.querySelectorAll('.book-row button').forEach(button => {
            button.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent the status button from triggering a row click
                handleChangeBookStatus(button);
            });
        });
    }

    // Modal Logic
    function initializeModalListeners() {
        modals.forEach(modal => {
            const closeButton = createCloseButton(modal);
            appendCloseButton(modal, closeButton);

            // Close modal when clicking outside
            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    closeVisibility(modal);
                }
            });
        });
    }

    function createCloseButton(modal) {
        const closeButton = document.createElement('span');
        closeButton.classList.add('close');
        closeButton.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        closeButton.addEventListener('click', () => {
            closeVisibility(modal);
        });
        return closeButton;
    }

    function appendCloseButton(modal, closeButton) {
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.prepend(closeButton);
        }
    }

    // Form Logic
    function initializeFormListeners() {
        bookForm.addEventListener('submit', handleSubmit);
        isbnForm.addEventListener('submit', handleSubmitIsbnForm);
        deleteBookButton.addEventListener('click', handleDelete);
    }

    // Other

    editBookButton.addEventListener('click', () => {
        closeVisibility(viewBookModal);
        openVisibility(addEditBookModal);
        document.getElementById('formModeInput').value = 'edit';
    });
});
