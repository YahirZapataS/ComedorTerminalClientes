import { db } from './firebaseConfig.js';
import { collection, getDocs, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', async function() {
    const form = document.getElementById('agregarCompraForm');
    const productosContainer = document.getElementById('productos');
    const agregarProductoBtn = document.getElementById('agregarProducto');

    // Obtener el ID del cliente de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const clienteId = parseInt(urlParams.get('clienteId'));

    agregarProductoBtn.addEventListener('click', function(event) {
        event.preventDefault();
        agregarProductoInput();
    });

    function agregarProductoInput() {
        const nuevoProductoDiv = document.createElement('div');
        nuevoProductoDiv.classList.add('producto');
        nuevoProductoDiv.innerHTML = `
            <label for="nombreProducto">Nombre del Producto:</label>
            <input type="text" class="nombreProducto">
            <label for="cantidadProducto">Cantidad:</label>
            <input type="number" class="cantidadProducto">
            <label for="precioProducto">Precio:</label>
            <input type="number" class="precioProducto" step="0.01" required>
            <button type="button" class="eliminarProductoBtn">Eliminar Producto</button>
        `;

        const eliminarProductoBtn = nuevoProductoDiv.querySelector('.eliminarProductoBtn');
        eliminarProductoBtn.addEventListener('click', function() {
            productosContainer.removeChild(nuevoProductoDiv);
        });

        productosContainer.appendChild(nuevoProductoDiv);
    }

    form.addEventListener('submit', async function(event) {
        event.preventDefault();

        if (isNaN(clienteId)) {
            console.error('ID del cliente debe ser un número válido');
            mostrarAlerta("Alerta!", "ID del cliente debe ser un número válido", "error");
            return;
        }

        const compras = [];

        const productosInputs = document.querySelectorAll('.producto');
        productosInputs.forEach(productoDiv => {
            const nombreProducto = productoDiv.querySelector('.nombreProducto').value;
            const cantidadProducto = parseInt(productoDiv.querySelector('.cantidadProducto').value);
            const precioProducto = parseFloat(productoDiv.querySelector('.precioProducto').value);

            if (!isNaN(precioProducto)) {
                compras.push({
                    producto: { nombre: nombreProducto || '', precio: precioProducto },
                    cantidad: isNaN(cantidadProducto) ? 1 : cantidadProducto,
                    fecha: new Date().toISOString()
                });
            }
        });

        if (compras.length === 0) {
            console.error('Debes ingresar al menos un precio válido');
            mostrarAlerta("Alerta!", "Debes ingresar al menos un precio válido", "error");
            return;
        }

        try {
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
                console.error('Cliente no encontrado');
                mostrarAlerta("Alerta!", "Cliente no encontrado", "error");
                return;
            }

            const clienteData = clienteDoc.data();
            const comprasActualizadas = clienteData.compras || [];
            comprasActualizadas.push(...compras);

            // Recalcular el total de la cuenta
            const totalCuentaActualizado = comprasActualizadas.reduce((total, compra) => {
                return total + (compra.producto.precio * compra.cantidad);
            }, 0);

            await updateDoc(doc(db, 'clientes', clienteDoc.id), {
                compras: comprasActualizadas,
                totalCuenta: totalCuentaActualizado
            });
            console.log('Compra(s) agregada(s) correctamente y totalCuenta actualizado');

            mostrarAlerta("Listo!", "Compra(s) agregada(s) correctamente", "success");

        } catch (error) {
            console.error('Error al agregar compra:', error);
            mostrarAlerta("Algo pasó", "No hemos podido guardar los datos de la compra", "error");
        }
    });

    function mostrarAlerta(title, text, icon) {
        Swal.fire({
            title: title,
            text: text,
            icon: icon
        });
    }
});