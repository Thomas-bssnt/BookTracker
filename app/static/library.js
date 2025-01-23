// API_ENDPOINTS

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

// APIService

class APIService {
    static async fetchBookByID(bookId) {
        const response = await fetch(API_ENDPOINTS.READ_BOOK(bookId), {
            method: 'GET'
        });
        return this.handleResponse(response);
    }

    static async submitEditBookForm(formData, mode, bookId) {
        const url = mode === 'add' ? API_ENDPOINTS.CREATE_BOOK : API_ENDPOINTS.UPDATE_BOOK(bookId);
        const method = mode === 'add' ? 'POST' : 'PUT';

        const response = await fetch(url, {
            method: method,
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: formData,
        });
        return this.handleResponse(response);
    }

    static async deleteBook(bookId) {
        const response = await fetch(API_ENDPOINTS.DELETE_BOOK(bookId), {
            method: 'DELETE',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        });
        return this.handleResponse(response);
    }

    static async editStatus(bookId, status) {
        const response = await fetch(API_ENDPOINTS.UPDATE_BOOK_STATUS(bookId), {
            method: 'PATCH',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: `status=${status}`,
        });
        return this.handleResponse(response);
    }

    static async fetchBookByISBN(isbn) {
        const response = await fetch(API_ENDPOINTS.READ_BOOK_ISBN(isbn), {
            method: 'GET',
        });
        return this.handleResponse(response);
    }

    static async handleResponse(response) {
        const responseData = await response.json();
        if (responseData.status === 'fail' || responseData.status === 'error') {
            throw new Error(responseData.data.error || responseData.message);
        }
        return responseData.data;
    }
}

// UIUtils

class UIUtils {

    static openModal(element) {
        element.classList.add('show');
    }

    static closeModal(element) {
        element.classList.remove('show');
    }

    static toggleModal(element) {
        element.classList.toggle('show');
    }

    static updateModalWithBookData(data) {
        // TODO: split this function in two?

        const fields = ['title', 'author_last', 'author_first', 'series', 'volume', 'year', 'language', 'genre', 'written_form', 'publisher', 'collection', 'isbn'];

        fields.forEach(field => {
            document.getElementById(`viewMode-${field}`).textContent = data[field];
            document.getElementById(`formMode-${field}`).value = data[field];
        });

        DOMElements.deleteBookButton.dataset.bookId = data.id;
        DOMElements.editBookButton.dataset.bookId = data.id;
        DOMElements.bookForm.dataset.bookId = data.id;
    }

    static getStatusIcon(status) {
        switch (status) {
            case 'read':
                return '<i class="fa-solid fa-check"></i>';
            case 'reading':
                return '<i class="fa-solid fa-minus"></i>';
            default:
                return '<i class="fa-solid fa-xmark"></i>';
        }
    }

    static createBookRow(book, existingStatus = null) {
        const row = document.createElement('tr');
        row.classList.add('book-row');

        row.dataset.bookId = book["id"];
        row.dataset.authorLast = book["author_last"];
        row.dataset.authorFirst = book["author_first"];
        row.dataset.year = book["year"];
        row.dataset.series = book["series"];
        row.dataset.volume = book["volume"];
        row.dataset.title = book["title"];

        const status = existingStatus || 'not_read';
        const statusIcon = this.getStatusIcon(status);

        row.innerHTML = `
            <td>${book.title}</td>
            <td>${book["author_first"]} ${book["author_last"]}</td>
            <td>${book["series"] ? `${book["series"]} #${book.volume}` : ''}</td>
            <td>${book.year || ''}</td>
            <td>
                <button id="bookStatusButton" class="icon" data-current-status="${book.status}">
                    ${statusIcon}
                </button>
            </td>
        `;

        // TODO: Find a way to move this event listener with the others
        row.addEventListener('click', () => handleRowClick(row));
        const statusButton = row.querySelector('#bookStatusButton');
        statusButton.addEventListener('click', (event) => {
            event.stopPropagation();
            handleChangeBookStatus(statusButton);
        });

        return row;
    }

    static sortCriterion(a, b) {
        const keys = ["authorLast", "authorFirst", "year", "series", "volume", "title"];
        for (const key of keys) {
            const comparison = (a.dataset[key] || '').localeCompare(b.dataset[key] || '');
            if (comparison !== 0) {
                return comparison;
            }
        }
        return 0;
    }

    static updateTableWithBook(book, mode = 'add') {
        const tbody = document.querySelector('.book-table tbody');
        const existingRow = document.querySelector(`tr[data-book-id="${book.id}"]`);

        if (mode === 'add' || mode === 'edit') {
            const rows = Array.from(tbody.querySelectorAll('tr'));

            if (mode === 'edit' && existingRow) {
                const existingStatusButton = existingRow.querySelector('#bookStatusButton');
                book.status = existingStatusButton.dataset.currentStatus;
                rows.splice(rows.indexOf(existingRow), 1);
            }

            const newRow = UIUtils.createBookRow(book, book.status);
            rows.push(newRow);

            rows.sort(this.sortCriterion);

            tbody.innerHTML = '';
            rows.forEach(row => tbody.appendChild(row));
        } else if (mode === 'delete' && existingRow) {
            existingRow.remove();
        }
    }
}

// Event handlers

const handleRowClick = async (row) => {
    const bookId = row.dataset.bookId;
    try {
        const data = await APIService.fetchBookByID(bookId);
        UIUtils.updateModalWithBookData(data["book"]);
        UIUtils.openModal(DOMElements.viewBookModal);
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
        const data = await APIService.submitEditBookForm(formData, mode, bookId);
        if (data.message) {
            UIUtils.closeModal(DOMElements.addEditBookModal);
            UIUtils.updateTableWithBook(data["book"], mode);
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
        const data = await APIService.fetchBookByISBN(isbn);
        UIUtils.closeModal(DOMElements.isbnModal);
        UIUtils.openModal(DOMElements.addEditBookModal);
        DOMElements.bookForm.reset();
        UIUtils.updateModalWithBookData(data["book"]);
        document.getElementById('formModeInput').value = 'add';
    } catch (error) {
        console.error('An unexpected error occurred:', error);
    }
};

const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce livre ?')) return;
    try {
        const bookId = DOMElements.deleteBookButton.dataset.bookId;
        await APIService.deleteBook(bookId);

        UIUtils.closeModal(DOMElements.viewBookModal);
        UIUtils.updateTableWithBook({id: bookId}, 'delete');
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
        await APIService.editStatus(bookId, newStatus);
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
            UIUtils.toggleModal(DOMElements.addBookDropdown);
        });

        document.addEventListener("click", (event) => {
            if (!DOMElements.addBookDropdown.contains(event.target) && !DOMElements.addBookButton.contains(event.target)) {
                UIUtils.closeModal(DOMElements.addBookDropdown);
            }
        });

        DOMElements.manualAddButton.addEventListener('click', () => {
            UIUtils.closeModal(DOMElements.addBookDropdown);
            UIUtils.openModal(DOMElements.addEditBookModal)
            DOMElements.bookForm.reset();
            document.getElementById('formModeInput').value = 'add';
        });

        DOMElements.isbnAddButton.addEventListener('click', () => {
            UIUtils.closeModal(DOMElements.addBookDropdown);
            UIUtils.openModal(DOMElements.isbnModal);
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
                    UIUtils.closeModal(modal);
                }
            });
        });
    }

    function createCloseButton(modal) {
        const closeButton = document.createElement('span');
        closeButton.classList.add('close');
        closeButton.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        closeButton.addEventListener('click', () => {
            UIUtils.closeModal(modal);
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
        UIUtils.closeModal(DOMElements.viewBookModal);
        UIUtils.openModal(DOMElements.addEditBookModal);
        document.getElementById('formModeInput').value = 'edit';
    });

    // Initialize the book table
    const tbody = document.querySelector('.book-table tbody');
    const books = JSON.parse(document.getElementById('books-data').textContent);

    const rows = books.map(book => UIUtils.createBookRow(book, book.status));

    // Sort rows
    rows.sort(UIUtils.sortCriterion);

    // Clear and repopulate tbody
    tbody.innerHTML = '';
    rows.forEach(row => tbody.appendChild(row));
});
