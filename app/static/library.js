// Constants

const API_ENDPOINTS = {
    CREATE_BOOK: '/api/books',
    READ_BOOK: (bookId) => `/api/books/${bookId}`,
    READ_BOOK_ISBN: (isbn) => `/api/books/isbn/${isbn}`,
    UPDATE_BOOK: (bookId) => `/api/books/${bookId}`,
    UPDATE_BOOK_STATUS: (bookId) => `/api/books/${bookId}/status`,
    DELETE_BOOK: (bookId) => `/api/books/${bookId}`,
};

// DOMElements

class DOMElements {
    // viewBookModal
    static viewBookModal = document.getElementById('viewBookModal');
    static editBookButton = document.getElementById('editBookButton');
    static deleteBookButton = document.getElementById('deleteBookButton');
    // addEditBookModal
    static addEditBookModal = document.getElementById('addEditBookModal');
    static bookForm = document.getElementById('bookForm');
    // isbnModal
    static isbnModal = document.getElementById('isbnModal');
    static isbnForm = document.getElementById('isbnForm');
    // addBookDropdown
    static addBookDropdown = document.getElementById("addBookDropdown");
    static addBookButton = document.getElementById('addBookButton');
    static manualAddButton = document.getElementById('manualAddButton');
    static isbnAddButton = document.getElementById('isbnAddButton');
}

// Utility functions

const updateModalWithBookData = (data) => {
    const fields = ['title', 'author_last', 'author_first', 'series', 'volume', 'year', 'language', 'genre', 'written_form', 'publisher', 'collection', 'isbn'];
    fields.forEach(field => {
        document.getElementById(`viewMode-${field}`).textContent = data[field];
        document.getElementById(`formMode-${field}`).value = data[field];
    });
    DOMElements.deleteBookButton.dataset.bookId = data['id'];
    DOMElements.editBookButton.dataset.bookId = data['id'];
    DOMElements.bookForm.dataset.bookId = data['id'];
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
        openVisibility(DOMElements.viewBookModal);

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
    const bookId = DOMElements.bookForm.dataset.bookId;
    try {
        const data = await submitEditBookForm(formData, mode, bookId);
        if (data.message) {
            closeVisibility(DOMElements.addEditBookModal);
            updateTableWithBook(data.book, mode);
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
        closeVisibility(DOMElements.isbnModal);
        openVisibility(DOMElements.addEditBookModal);
        DOMElements.bookForm.reset();
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

const createBookRow = (book, existingStatus = null) => {
    const row = document.createElement('tr');
    row.classList.add('book-row');
    row.dataset.bookId = book.id;
    row.dataset.authorLast = book.author_last;
    row.dataset.authorFirst = book.author_first;
    row.dataset.year = book.year;

    const status = existingStatus || 'not_read';
    let statusIcon;
    switch (status) {
        case 'read':
            statusIcon = '<i class="fa-solid fa-check"></i>';
            break;
        case 'reading':
            statusIcon = '<i class="fa-solid fa-minus"></i>';
            break;
        default:
            statusIcon = '<i class="fa-solid fa-xmark"></i>';
    }

    row.innerHTML = `
        <td>${book.title}</td>
        <td>${book.author_first} ${book.author_last}</td>
        <td>${book.series ? `${book.series} #${book.volume}` : ''}</td>
        <td>${book.year || ''}</td>
        <td>
            <button id="bookStatusButton" class="icon" data-current-status="${book.status}">
                ${statusIcon}
            </button>
        </td>
    `;

    // Add event listeners to the new row
    row.addEventListener('click', () => handleRowClick(row));
    const statusButton = row.querySelector('#bookStatusButton');
    statusButton.addEventListener('click', (event) => {
        event.stopPropagation();
        handleChangeBookStatus(statusButton);
    });
    return row;
};

function sortCriterion() {
    return (a, b) => {
        const getComparisonData = (row) => ({
            lastName: row.dataset.authorLast,
            firstName: row.dataset.authorFirst,
            year: row.dataset.year || ''
        });

        const aData = getComparisonData(a);
        const bData = getComparisonData(b);

        if (aData.lastName.localeCompare(bData.lastName) !== 0) {
            return aData.lastName.localeCompare(bData.lastName);
        }
        if (aData.firstName.localeCompare(bData.firstName) !== 0) {
            return aData.firstName.localeCompare(bData.firstName);
        }
        return aData.year.localeCompare(bData.year);
    };
}

const updateTableWithBook = (book, mode = 'add') => {
    const tbody = document.querySelector('.book-table tbody');
    const existingRow = document.querySelector(`tr[data-book-id="${book.id}"]`);


    if (mode === 'add' || mode === 'edit') {
        const rows = Array.from(tbody.querySelectorAll('tr'));

        // If editing, remove the existing row first and keep status
        if (mode === 'edit' && existingRow) {
            const existingStatusButton = existingRow.querySelector('#bookStatusButton');
            book.status = existingStatusButton.dataset.currentStatus;
            rows.splice(rows.indexOf(existingRow), 1);
        }

        const newRow = createBookRow(book, book.status);
        rows.push(newRow);

        // Sort rows
        rows.sort(sortCriterion());

        // Clear and repopulate tbody
        tbody.innerHTML = '';
        rows.forEach(row => tbody.appendChild(row));
    } else if (mode === 'delete' && existingRow) {
        existingRow.remove();
    }
};

const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce livre ?')) return;
    try {
        const bookId = DOMElements.deleteBookButton.dataset.bookId;
        await deleteBook(bookId);

        closeVisibility(DOMElements.viewBookModal);
        updateTableWithBook({id: bookId}, 'delete');
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
        DOMElements.addBookButton.addEventListener("click", () => {
            toggleVisibility(DOMElements.addBookDropdown);
        });

        document.addEventListener("click", (event) => {
            if (!DOMElements.addBookDropdown.contains(event.target) && !DOMElements.addBookButton.contains(event.target)) {
                closeVisibility(DOMElements.addBookDropdown);
            }
        });

        DOMElements.manualAddButton.addEventListener('click', () => {
            closeVisibility(DOMElements.addBookDropdown);
            openVisibility(DOMElements.addEditBookModal)
            DOMElements.bookForm.reset();
            document.getElementById('formModeInput').value = 'add';
        });

        DOMElements.isbnAddButton.addEventListener('click', () => {
            closeVisibility(DOMElements.addBookDropdown);
            openVisibility(DOMElements.isbnModal);
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
        DOMElements.bookForm.addEventListener('submit', handleSubmit);
        DOMElements.isbnForm.addEventListener('submit', handleSubmitIsbnForm);
        DOMElements.deleteBookButton.addEventListener('click', handleDelete);
    }

    // Other

    DOMElements.editBookButton.addEventListener('click', () => {
        closeVisibility(DOMElements.viewBookModal);
        openVisibility(DOMElements.addEditBookModal);
        document.getElementById('formModeInput').value = 'edit';
    });

    // Initialize the book table
    const tbody = document.querySelector('.book-table tbody');
    const books = JSON.parse(document.getElementById('books-data').textContent);

    const rows = books.map(book => createBookRow(book, book.status));

    // Sort rows
    rows.sort(sortCriterion());

    // Clear and repopulate tbody
    tbody.innerHTML = '';
    rows.forEach(row => tbody.appendChild(row));
});
