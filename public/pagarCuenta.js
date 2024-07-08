import { db } from './firebaseConfig.js';
import { collection, getDocs, doc, updateDoc, addDoc } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const clienteId = parseInt(urlParams.get('clienteId'));

    if (isNaN(clienteId)) {
        mostrarAlerta("Alerta!", "ID del cliente debe ser un número válido", "error");
        return;
    }

    const clientesRef = collection(db, 'clientes');
    const snapshot = await getDocs(clientesRef);
    let clienteDoc = null;

    snapshot.forEach(doc => {
        const cliente = doc.data();
        if (cliente.id === clienteId) {
            clienteDoc = doc;
        }
    });

    if (!clienteDoc) {
        mostrarAlerta("Alerta!", "Cliente no encontrado", "error");
        return;
    }

    const clienteData = clienteDoc.data();
    const pagoContainer = document.getElementById('pagoContainer');
    pagoContainer.innerHTML = `
        <p>Total Cuenta: $${clienteData.totalCuenta ? clienteData.totalCuenta.toFixed(2) : '0.00'}</p>
        <label for="tipoPago">Tipo de Pago:</label>
        <select id="tipoPago">
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
        </select>
        <div id="efectivoContainer">
            <label for="monto">Monto a Pagar:</label>
            <input type="number" id="monto" step="0.01" required>
            <label for="efectivo">Efectivo:</label>
            <input type="number" id="efectivo" step="0.01" required>
            <p id="cambio"></p>
        </div>
        <div id="transferenciaContainer" style="display: none;">
            <label for="transferencia">Monto Transferido:</label>
            <input type="number" id="transferencia" step="0.01" required>
        </div>
        <button id="btnRealizarPago">Realizar Pago</button>
    `;

    const tipoPagoSelect = document.getElementById('tipoPago');
    tipoPagoSelect.addEventListener('change', () => {
        const tipoPago = tipoPagoSelect.value;
        const efectivoContainer = document.getElementById('efectivoContainer');
        const transferenciaContainer = document.getElementById('transferenciaContainer');

        if (tipoPago === 'transferencia') {
            efectivoContainer.style.display = 'none';
            transferenciaContainer.style.display = 'block';
        } else {
            efectivoContainer.style.display = 'block';
            transferenciaContainer.style.display = 'none';
        }
    });

    // Función para actualizar el cambio en efectivo
    function updateCambio() {
        const monto = parseFloat(document.getElementById('monto').value);
        const efectivo = parseFloat(document.getElementById('efectivo').value);

        if (!isNaN(monto) && !isNaN(efectivo)) {
            const cambio = efectivo - monto;
            document.getElementById('cambio').textContent = cambio >= 0 ? `Cambio: $${cambio.toFixed(2)}` : "Efectivo insuficiente";
        } else {
            document.getElementById('cambio').textContent = "";
        }
    }

    document.getElementById('monto').addEventListener('input', updateCambio);
    document.getElementById('efectivo').addEventListener('input', updateCambio);

    document.getElementById('btnRealizarPago').addEventListener('click', async () => {
        const tipoPago = tipoPagoSelect.value;
        let monto = parseFloat(document.getElementById('monto').value);
        let efectivo = parseFloat(document.getElementById('efectivo').value);
        let transferencia = parseFloat(document.getElementById('transferencia').value);
        let cambio = 0;

        if (tipoPago === 'efectivo') {
            if (isNaN(monto) || monto <= 0) {
                mostrarAlerta("Alerta!", "El monto a pagar debe ser un número válido mayor que 0", "error");
                return;
            }

            if (isNaN(efectivo) || efectivo <= 0) {
                mostrarAlerta("Alerta!", "El efectivo debe ser un número válido mayor que 0", "error");
                return;
            }

            if (efectivo < monto) {
                mostrarAlerta("Alerta!", "El efectivo debe ser mayor o igual al monto a pagar", "error");
                return;
            }

            cambio = efectivo - monto;
        } else if (tipoPago === 'transferencia') {
            if (isNaN(transferencia) || transferencia <= 0) {
                mostrarAlerta("Alerta!", "El monto transferido debe ser un número válido mayor que 0", "error");
                return;
            }

            monto = transferencia;
        }

        if (monto <= 0) {
            mostrarAlerta("Alerta!", "El monto debe ser mayor que 0", "error");
            return;
        }

        const totalCuentaActualizado = clienteData.totalCuenta - monto;
        if (totalCuentaActualizado < 0) {
            mostrarAlerta("Alerta!", "El monto supera el total de la cuenta", "error");
            return;
        }

        try {
            // Solicitar código de cajero
            await solicitarCodigoCajero();

            // Actualizar el total de la cuenta
            await updateDoc(doc(db, 'clientes', clienteDoc.id), {
                totalCuenta: totalCuentaActualizado
            });

            // Agregar el pago como un documento en la subcolección 'pagos'
            await addDoc(collection(db, 'clientes', clienteDoc.id, 'pagos'), {
                monto: monto,
                efectivo: tipoPago === 'efectivo' ? efectivo : null,
                tipoPago: tipoPago,
                fecha: new Date().toISOString()
            });

            const mensaje = tipoPago === 'efectivo' ? `El cambio es: $${cambio.toFixed(2)}` : "";
            mostrarAlertaConRedireccion("Pago realizado correctamente", mensaje, "success");
        } catch (error) {
            mostrarAlerta("Algo pasó", "No hemos podido actualizar el total de la cuenta", "error");
        }
    });
});

async function solicitarCodigoCajero() {
    const { value: codigo } = await Swal.fire({
        title: 'Ingrese el código',
        input: 'password',
        inputPlaceholder: 'Código de Cajero',
        showCancelButton: true,
        confirmButtonText: 'Verificar',
        cancelButtonText: 'Cancelar'
    });

    if (codigo !== '0948') {
        Swal.fire({
            title: 'Código incorrecto',
            text: 'El código ingresado es incorrecto. Intente nuevamente.',
            icon: 'error'
        });
        throw new Error('Código de cajero incorrecto');
    }
}

function mostrarAlerta(title, text, icon) {
    Swal.fire({
        title: title,
        text: text,
        icon: icon
    });
}

function mostrarAlertaConRedireccion(title, text, icon) {
    Swal.fire({
        title: title,
        text: text,
        icon: icon,
        confirmButtonText: 'OK'
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = 'index.html';
        }
    });
}