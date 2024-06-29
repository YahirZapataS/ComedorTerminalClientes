import { db } from './firebaseConfig.js';
import { collection, addDoc, getDocs } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', async function() {
    const form = document.getElementById('agregarClienteForm');
    const nombreInput = document.getElementById('nombre');
    const telefonoInput = document.getElementById('telefono');
    const sinTelefonoCheckbox = document.getElementById('sinTelefono');

    let ultimoId = await obtenerUltimoId();

    form.addEventListener('submit', async function(event) {
        event.preventDefault();

        const nombre = nombreInput.value;
        let telefono = telefonoInput.value;

        if (!nombre) {
            console.error('Nombre no puede estar vacío');
            mostrarAlerta("Alerta!", "Debes ingresar el nombre del cliente", "error");
            return;
        }

        if (sinTelefonoCheckbox.checked) {
            telefono = '';
        } else if (!telefono) {
            console.error('Teléfono no puede estar vacío');
            mostrarAlerta("Alerta!", "Debes ingresar el teléfono del cliente o seleccionar omitir teléfono", "error");
            return;
        }

        try {
            const clientesRef = collection(db, 'clientes');

            ultimoId++;

            await addDoc(clientesRef, { id: ultimoId, nombre, telefono, compras: [], totalCuenta: 0 });
            console.log('Cliente agregado correctamente');

            mostrarAlerta("Listo!", "Cliente agregado correctamente", "success");
            nombreInput.value = '';
            telefonoInput.value = '';
            sinTelefonoCheckbox.checked = false;
            telefonoInput.disabled = true;
        } catch (error) {
            console.error('Error al agregar cliente:', error);
            mostrarAlerta("Algo pasó", "No hemos podido guardar los datos del cliente", "error");
        }
    });

    function mostrarAlerta(title, text, icon) {
        Swal.fire({
            title: title,
            text: text,
            icon: icon
        });
    }

    window.toggleTelefonoInput = function() {
        telefonoInput.disabled = sinTelefonoCheckbox.checked;
        if (sinTelefonoCheckbox.checked) {
            telefonoInput.value = '';
        }
    };

    async function obtenerUltimoId() {
        const clientesRef = collection(db, 'clientes');
        const snapshot = await getDocs(clientesRef);
        let maxId = 0;

        snapshot.forEach(doc => {
            const cliente = doc.data();
            if (cliente.id > maxId) {
                maxId = cliente.id;
            }
        });

        return maxId;
    }
});