var draggedElementId = null; // Globalna varijabla za čuvanje ID-a povučenog elementa
var mouseDragActive = false;

// Funkcija za drag događaj (za miša, ne za dodirne događaje)
function drag(event) {
    if (event.dataTransfer) {
        draggedElementId = event.target.id; // Čuvanje ID-ja elementa koji se povlači
        event.dataTransfer.setData("text", draggedElementId);
        mouseDragActive = true;
    }
}

function allowDrop(event) {
    event.preventDefault(); // Omogućavanje drop funkcionalnosti
}

function drop(event) {
    event.preventDefault();
    var data = draggedElementId; // Korišćenje globalne varijable za ID
    if (data) {
        var target = event.target.classList.contains('dropBox') ? event.target : null;
        if (target) {
            target.appendChild(document.getElementById(data));
            clearSelection();
            openNewPageIfAllFilled(); // Proverava da li su svi dropbox-ovi popunjeni
        }
        draggedElementId = null; // Resetovanje varijable nakon drop-a
        mouseDragActive = false;
    }
}

// Dodavanje dodirnih događaja
function addTouchEvents(element) {
    var startX, startY, isDragging = false;

    element.addEventListener('touchstart', function (e) {
        var touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        isDragging = true;
        draggedElementId = e.target.id; // Čuvanje ID-ja elementa koji se povlači
        e.preventDefault(); // Sprečavanje defaultnog ponašanja
    });

    element.addEventListener('touchmove', function (e) {
        var touch = e.touches[0];
        var endX = touch.clientX;
        var endY = touch.clientY;
        if (isDragging && (Math.abs(endX - startX) > 10 || Math.abs(endY - startY) > 10)) {
            e.preventDefault(); // Sprečavanje defaultnog ponašanja
        }
    });

    element.addEventListener('touchend', function (e) {
        e.preventDefault();
        if (isDragging && draggedElementId) {
            var dropTarget = document.elementFromPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
            if (dropTarget && dropTarget.classList.contains('dropBox')) {
                dropTarget.appendChild(document.getElementById(draggedElementId));
                clearSelection();
                openNewPageIfAllFilled(); // Proverava da li su svi dropbox-ovi popunjeni
            }
            isDragging = false; // Resetovanje stanja nakon završetka
        }
        draggedElementId = null; // Resetovanje varijable nakon drop-a
    });

    // Sprečavanje desnog klika (contextmenu) dugim pritiskom
    element.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    }, false);
}

// Dodavanje dodirnih događaja za sve elemente sa klasom "images"
var images = document.querySelectorAll('.images');
images.forEach(function (image) {
    addTouchEvents(image);
});

// Rezervni način igranja: klikom ili tastaturom izaberi domino, pa polje
function clearSelection() {
    document.querySelectorAll('.images.selected').forEach(function (el) {
        el.classList.remove('selected');
    });
    draggedElementId = null;
}

function selectTile(el) {
    var already = el.classList.contains('selected');
    clearSelection();
    if (!already) {
        el.classList.add('selected');
        draggedElementId = el.id;
    }
}

function placeInSlot(slot) {
    if (!draggedElementId) return;
    var tile = document.getElementById(draggedElementId);
    if (!tile) return;
    slot.appendChild(tile);
    clearSelection();
    openNewPageIfAllFilled();
}

images.forEach(function (image) {
    image.tabIndex = 0;
    image.addEventListener('click', function (e) {
        if (mouseDragActive) { mouseDragActive = false; return; }
        e.preventDefault();
        selectTile(image);
    });
    image.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selectTile(image);
        }
    });
});

document.querySelectorAll('.dropBox').forEach(function (slot) {
    slot.tabIndex = 0;
    slot.addEventListener('click', function () {
        placeInSlot(slot);
    });
    slot.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            placeInSlot(slot);
        }
    });
});

// Funkcija za proveru da li su svi dropbox-ovi popunjeni
function checkAllDropBoxesFilled() {
    const dropBoxes = document.querySelectorAll('.dropBox');
    for (let dropBox of dropBoxes) {
        if (dropBox.children.length === 0) {
            return false; // Ako je dropBox prazan
        }
    }
    return true; // Svi su popunjeni
}

// Provera da li je redosled slika tačan i otvaranje nove stranice ako jeste
function openNewPageIfAllFilled() {
    const specificOrders = [
        ['block1', 'block3', 'block5', 'block7', 'block2', 'block4', 'block6', 'block8'],
        ['block2', 'block4', 'block6', 'block8', 'block3', 'block5', 'block7', 'block1'],
        ['block3', 'block5', 'block7', 'block1', 'block4', 'block6', 'block8', 'block2'],
        ['block4', 'block6', 'block8', 'block2', 'block5', 'block7', 'block1', 'block3'],
        ['block5', 'block7', 'block1', 'block3', 'block6', 'block8', 'block2', 'block4'],
        ['block6', 'block8', 'block2', 'block4', 'block7', 'block1', 'block3', 'block5'],
        ['block7', 'block1', 'block3', 'block5', 'block8', 'block2', 'block4', 'block6'],
        ['block8', 'block2', 'block4', 'block6', 'block1', 'block3', 'block5', 'block7']
    ];

    for (let specificOrder of specificOrders) {
        let orderMatched = true;
        for (let i = 0; i < specificOrder.length; i++) {
            const dropBoxId = `mesto${i+1}`; // ID div-ova
            const dropBox = document.getElementById(dropBoxId);
            if (!dropBox || dropBox.children.length === 0 || dropBox.children[0].id !== specificOrder[i]) {
                orderMatched = false;
                break;
            }
        }
        if (orderMatched) {
            window.location.href = 'bravo.html';
            return; // Tačan redosled u svim div-ovima => otvara se stranica
        }
    }
    // Ako redosled nije tačan, ne dešava se ništa
}

// Funkcija koja se izvršava kada se stranica učita
window.onload = function () {
    var parent = document.getElementById('drag');
    var frag = document.createDocumentFragment();
    while (parent.children.length) {
        frag.appendChild(parent.children[Math.floor(Math.random() * parent.children.length)]);
    }
    parent.appendChild(frag);
};

// Niz slika
const imageIds = ["block1", "block2", "block3", "block4", "block5", "block6", "block7", "block8"];

// Uzimanje nasumičnog ID-a
const randomId = imageIds[Math.floor(Math.random() * imageIds.length)];

// Uzimanje slike sa tim ID-em
const image = document.getElementById(randomId);
if (image) {
    // 'prva' div i postavljanje slike tu
    const prvaDiv = document.getElementById('mesto1');
    prvaDiv.appendChild(image);
}