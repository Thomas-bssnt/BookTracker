const API_ENDPOINTS = {
    CREATE_BOOK: '/api/books',
    READ_BOOK: (bookId) => `/api/books/${bookId}`,
    READ_BOOK_ISBN: (isbn) => `/api/books/isbn/${isbn}`,
    UPDATE_BOOK: (bookId) => `/api/books/${bookId}`,
    UPDATE_BOOK_STATUS: (bookId) => `/api/books/${bookId}/status`,
    DELETE_BOOK: (bookId) => `/api/books/${bookId}`,
};

class DOMElements {
    // viewBookModal
    static viewBookModal = document.getElementById('viewBookModal');
    static editBookButton = document.getElementById('editBookButton');
    static deleteBookButton = document.getElementById('deleteBookButton');
    // addEditBookModal
    static addEditBookModal = document.getElementById('addEditBookModal');
    static bookForm = document.getElementById('bookForm');
    static seriesInput = document.getElementById("formMode-series");
    static volumeInput = document.getElementById("formMode-volume");
    // isbnModal
    static isbnModal = document.getElementById('isbnModal');
    static isbnForm = document.getElementById('isbnForm');
    // barcodeModal
    static barcodeModal = document.getElementById('barcodeModal');
    static scannerContainer = document.getElementById('scanner-container');
    // addBookDropdown
    static addBookDropdown = document.getElementById("addBookDropdown");
    static addBookButton = document.getElementById('addBookButton');
    static manualAddButton = document.getElementById('manualAddButton');
    static isbnAddButton = document.getElementById('isbnAddButton');
    static barcodeAddButton = document.getElementById('barcodeAddButton');
}

class LibraryLoader {
    static loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
}

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

class UIUtils {

    static openModal(element) {
        element.classList.add('show');
    }

    static closeModal(element) {
        element.classList.remove('show');

        if (element === DOMElements.barcodeModal) {
            ScannerService.stopScanner();
        }
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

class ScannerService {
    static isScanning = false;
    static isLibraryLoaded = false;
    static lastResult = null;
    static scannerConfig = {
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: null,
            constraints: {
                width: {min: 640},
                height: {min: 480},
                facingMode: "environment",
                aspectRatio: {min: 1, max: 2}
            }
        },
        locator: {patchSize: "medium", halfSample: true},
        numOfWorkers: 2,
        frequency: 10,
        decoder: {readers: ["ean_reader", "ean_8_reader"]},
        locate: true
    };

    static async ensureLibraryLoaded() {
        if (this.isLibraryLoaded) return;

        try {
            await LibraryLoader.loadScript('https://cdn.jsdelivr.net/npm/quagga@0.12.1/dist/quagga.min.js');
            this.isLibraryLoaded = true;
        } catch (error) {
            console.error('Failed to load Quagga library:', error);
            throw new Error('Failed to load barcode scanner library.');
        }
    }

    static async requestCameraPermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({video: true});
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (err) {
            console.error("Camera permission denied:", err);
            alert("Camera access is required for scanning barcodes.");
            return false;
        }
    }

    static async initializeScanner() {
        this.scannerConfig.inputStream.target = DOMElements.scannerContainer;

        return new Promise((resolve, reject) => {
            Quagga.init(this.scannerConfig, async (err) => {
                if (err) {
                    return reject(err);
                }

                Quagga.onProcessed((result) => {
                    this._handleProcessed(result)
                });

                Quagga.onDetected((result) => {
                    const code = result.codeResult.code;
                    this._handleSuccessfulScan(code);
                });

                Quagga.start();
                this.isScanning = true;
                resolve();
            });
        });
    }

    static stopScanner() {
        if (this.isScanning) {
            Quagga.stop();
            this.isScanning = false;
            this.lastResult = null;
            document.getElementById('deviceSelection')?.remove();
        }
    }

    static _handleProcessed(result) {
        const drawingCtx = Quagga.canvas.ctx.overlay;
        const drawingCanvas = Quagga.canvas.dom.overlay;

        if (!result) {
            return;
        }

        drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);

        if (result.boxes) {
            result.boxes
                .filter(box => box !== result.box)
                .forEach(box => {
                    Quagga.ImageDebug.drawPath(box, {x: 0, y: 1}, drawingCtx, {color: "green", lineWidth: 2});
                });
        }

        if (result.box) {
            Quagga.ImageDebug.drawPath(result.box, {x: 0, y: 1}, drawingCtx, {color: "blue", lineWidth: 2});
        }

        if (result.codeResult && result.codeResult.code) {
            Quagga.ImageDebug.drawPath(result.line, {x: 'x', y: 'y'}, drawingCtx, {color: 'red', lineWidth: 3});
        }
    }


    static async _handleSuccessfulScan(isbn) {
        if (this.lastResult === isbn) {
            return;
        }
        this.lastResult = isbn;

        try {
            const data = await APIService.fetchBookByISBN(isbn);
            this.stopScanner();
            UIUtils.closeModal(DOMElements.barcodeModal);
            UIUtils.updateModalWithBookData(data["book"]);
            UIUtils.openModal(DOMElements.addEditBookModal);
            document.getElementById('formModeInput').value = 'add';
        } catch (error) {
            console.error('ISBN lookup failed::', error);
            this.lastResult = null;
        }
    }
}

class EventHandlers {
    // TODO: Improve error handling

    static async handleRowClick(row) {
        const bookId = row.dataset.bookId;
        try {
            const data = await APIService.fetchBookByID(bookId);
            UIUtils.updateModalWithBookData(data["book"]);
            UIUtils.openModal(DOMElements.viewBookModal);
        } catch (error) {
            console.error('Error fetching book data:', error);
        }
    }

    static async handleSubmit(event) {
        event.preventDefault();
        const formData = new URLSearchParams([...new FormData(event.target)]);

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
    }

    static async handleSubmitIsbnForm(event) {
        event.preventDefault();
        const isbnInput = document.getElementById('isbnForm-isbn');
        const isbn = isbnInput.value.trim();
        DOMElements.isbnForm.reset();

        try {
            const data = await APIService.fetchBookByISBN(isbn);
            UIUtils.closeModal(DOMElements.isbnModal);
            UIUtils.updateModalWithBookData(data["book"]);
            UIUtils.openModal(DOMElements.addEditBookModal);
            document.getElementById('formModeInput').value = 'add';
        } catch (error) {
            console.error('An unexpected error occurred:', error);
        }
    }

    static async handleDelete() {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce livre ?')) return;
        try {
            const bookId = DOMElements.deleteBookButton.dataset.bookId;
            await APIService.deleteBook(bookId);

            UIUtils.closeModal(DOMElements.viewBookModal);
            UIUtils.updateTableWithBook({id: bookId}, 'delete');
        } catch (error) {
            console.error('An unexpected error occurred while deleting the book:', error);
        }
    }

    static async handleChangeBookStatus(button) {
        const row = button.closest('.book-row');
        const bookId = row.getAttribute('data-book-id');
        const currentStatus = button.getAttribute('data-current-status');

        const determineNextStatus = (currentStatus) => {
            switch (currentStatus) {
                case 'not_read':
                    return 'reading';
                case 'reading':
                    return 'read';
                case 'read':
                    return 'not_read';
                default:
                    return 'reading';
            }
        };
        const newStatus = determineNextStatus(currentStatus);

        try {
            await APIService.editStatus(bookId, newStatus);
            button.setAttribute('data-current-status', newStatus);
            button.innerHTML = UIUtils.getStatusIcon(newStatus);
        } catch (error) {
            console.error('An unexpected error occurred while changing the book status:', error);
        }
    }
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

        DOMElements.barcodeAddButton.addEventListener('click', async () => {
            UIUtils.closeModal(DOMElements.addBookDropdown);
            UIUtils.openModal(DOMElements.barcodeModal);

            try {
                await ScannerService.ensureLibraryLoaded();
            } catch (error) {
                throw new Error('Scanner initialization failed: Unable to load required library');
            }

            const hasPermission = await ScannerService.requestCameraPermission();
            if (hasPermission) {
                try {
                    await ScannerService.initializeScanner();
                } catch (error) {
                    console.error('Failed to initialize scanner:', error);
                    UIUtils.closeModal(DOMElements.barcodeModal);
                }
            }
        });
    }

    // Table Row Logic
    function initializeRowListeners() {
        document.querySelectorAll('.book-table tbody').forEach(tbody => {
            tbody.addEventListener('click', async (event) => {
                const row = event.target.closest('.book-row');
                if (row) {
                    // Handle row click
                    if (!event.target.closest('#bookStatusButton')) {
                        await EventHandlers.handleRowClick(row);
                    }
                }

                const statusButton = event.target.closest('#bookStatusButton');
                if (statusButton) {
                    event.stopPropagation();
                    await EventHandlers.handleChangeBookStatus(statusButton);
                }
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
        DOMElements.bookForm.addEventListener('submit', EventHandlers.handleSubmit);
        DOMElements.isbnForm.addEventListener('submit', EventHandlers.handleSubmitIsbnForm);
        DOMElements.deleteBookButton.addEventListener('click', EventHandlers.handleDelete);
        DOMElements.editBookButton.addEventListener('click', () => {
            UIUtils.closeModal(DOMElements.viewBookModal);
            UIUtils.openModal(DOMElements.addEditBookModal);
            document.getElementById('formModeInput').value = 'edit';
        });
    }

    // Initialize book table
    const tbody = document.querySelector('.book-table tbody');
    const books = JSON.parse(document.getElementById('books-data').textContent);

    const rows = books.map(book => UIUtils.createBookRow(book, book.status));
    rows.sort(UIUtils.sortCriterion);
    rows.forEach(row => tbody.appendChild(row));

    //
    function toggleVolumeRequirement() {
        if (DOMElements.seriesInput.value.trim() !== "") {
            DOMElements.volumeInput.setAttribute("required", "required");
        } else {
            DOMElements.volumeInput.removeAttribute("required");
        }
    }

    DOMElements.seriesInput.addEventListener("input", toggleVolumeRequirement);

});
