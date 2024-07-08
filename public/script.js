import { db } from './firebaseConfig.js';
import { collection, getDocs, doc, runTransaction } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js';

class Cliente {
    constructor(id, nombre, telefono) {
        this.id = id;
        this.nombre = nombre;
        this.telefono = telefono;
        this.compras = [];
        this.totalCuenta = 0;
        this.fechaUltimoPago = null;
    }

    agregarCompra(compra) {
        this.compras.push(compra);
        this.totalCuenta += compra.producto.precio * compra.cantidad;
    }

    pagarCuenta(montoPago) {
        this.totalCuenta -= montoPago;
        if (this.totalCuenta < 0) {
            this.totalCuenta = 0;
        }
        this.fechaUltimoPago = new Date();
    }

    getTotalCuenta() {
        return this.compras.reduce((total, compra) => total + (compra.producto.precio * compra.cantidad), 0);
    }

    getComprasPorFecha() {
        const comprasPorFecha = {};
        this.compras.forEach(compra => {
            const fecha = compra.fecha.toDateString();
            if (!comprasPorFecha[fecha]) {
                comprasPorFecha[fecha] = [];
            }
            comprasPorFecha[fecha].push(compra);
        });
        return comprasPorFecha;
    }
}

class Compra {
    constructor(producto, cantidad, fecha) {
        this.producto = producto;
        this.cantidad = cantidad;
        this.fecha = fecha ? new Date(fecha) : new Date();
    }
}

class Producto {
    constructor(nombre, precio) {
        this.nombre = nombre;
        this.precio = precio;
    }
}

class GestorClientes {
    constructor() {
        this.clientes = [];
    }

    async cargarClientes() {
        const clientesRef = collection(db, 'clientes');
        const snapshot = await getDocs(clientesRef);

        this.clientes = [];

        snapshot.forEach(doc => {
            const clienteData = doc.data();
            const cliente = new Cliente(clienteData.id, clienteData.nombre, clienteData.telefono);

            if (clienteData.compras) {
                clienteData.compras.forEach(compraData => {
                    const producto = new Producto(compraData.producto.nombre, compraData.producto.precio || 0);
                    const compra = new Compra(producto, compraData.cantidad, compraData.fecha);
                    cliente.agregarCompra(compra);
                });
            }

            cliente.totalCuenta = clienteData.totalCuenta || 0;
            cliente.fechaUltimoPago = clienteData.fechaUltimoPago ? new Date(clienteData.fechaUltimoPago) : null;

            this.clientes.push(cliente);
        });

        this.clientes.sort((a, b) => a.id - b.id);
    }

    async buscarClientes(nombre) {
        if (!nombre.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Campo de búsqueda vacío',
                text: 'Por favor ingrese un nombre para buscar.',
            });
            return;
        }
    
        if (this.clientes.length === 0) {
            await this.cargarClientes();
        }
    
        const resultados = this.clientes.filter(cliente => cliente.nombre.toLowerCase().includes(nombre.toLowerCase()));
    
        if (resultados.length === 0) {
            Swal.fire({
                icon: 'error',
                title: 'No se encontraron resultados',
                text: 'No se encontró ningún cliente con ese nombre.',
            });
        } else {
            this.actualizarListaResultados(resultados);
        }
    }

    async buscarClientesId(id) {
        if (!id.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Campo de búsqueda vacío',
                text: 'Por favor indique un número de ID válido.',
            });
            return;
        }
    
        if (this.clientes.length === 0) {
            await this.cargarClientes();
        }
    
        const clienteId = parseInt(id);
        if (isNaN(clienteId)) {
            Swal.fire({
                icon: 'warning',
                title: 'ID inválido',
                text: 'El ID debe ser un número.',
            });
            return;
        }
    
        const resultados = this.clientes.filter(cliente => cliente.id === clienteId);
    
        if (resultados.length === 0) {
            Swal.fire({
                icon: 'error',
                title: 'No se encontraron resultados',
                text: 'No se encontró ningún cliente con ese ID.',
            });
        } else {
            this.actualizarListaResultados(resultados);
        }
    }
    
    actualizarListaResultados(resultados) {
        const clientesUl = document.getElementById('clientes');
        clientesUl.innerHTML = '';

        resultados.forEach(cliente => {
            const li = document.createElement('li');
            li.textContent = `ID: ${cliente.id} - Nombre: ${cliente.nombre} - Teléfono: ${cliente.telefono}`;

            const verCuentaBtn = document.createElement('button');
            verCuentaBtn.textContent = 'Ver Cuenta';
            verCuentaBtn.id = 'verCuentaBtn';
            verCuentaBtn.addEventListener('click', () => this.verCuenta(cliente.id));
            li.appendChild(verCuentaBtn);

            const agregarCompraBtn = document.createElement('button');
            agregarCompraBtn.textContent = 'Agregar Compra';
            agregarCompraBtn.id = 'agregarCompraBtn';
            agregarCompraBtn.addEventListener('click', () => window.location.href = `agregar_compra.html?clienteId=${cliente.id}`);
            li.appendChild(agregarCompraBtn);

            const pagarCuentaBtn = document.createElement('button');
            pagarCuentaBtn.textContent = 'Pagar Cuenta';
            pagarCuentaBtn.id = 'pagarCuentaBtn';
            pagarCuentaBtn.addEventListener('click', () => window.location.href = `pagarCuenta.html?clienteId=${cliente.id}`);
            li.appendChild(pagarCuentaBtn);

            clientesUl.appendChild(li);
        });
    }

    async verCuenta(clienteId) {
        const cliente = this.clientes.find(c => c.id === clienteId);
        if (!cliente) {
            console.error('Cliente no encontrado');
            return;
        }

        const contenido = document.getElementById('contenido');
        contenido.innerHTML = `
            <h2>Compras de ${cliente.nombre}</h2>
            <table id='tablaCompras'>
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Precio Unitario</th>
                        <th>Total</th>
                        <th>Fecha</th>
                    </tr>
                </thead>
                <tbody>
                    ${cliente.compras.map(compra => {
                        const producto = compra.producto;
                        const precio = producto.precio ? producto.precio.toFixed(2) : '0.00';
                        const total = (producto.precio * compra.cantidad).toFixed(2);
                        const fechaFormateada = new Date(compra.fecha).toDateString();
                        return `
                            <tr>
                                <td>${producto.nombre}</td>
                                <td>${compra.cantidad}</td>
                                <td>$${precio}</td>
                                <td>$${total}</td>
                                <td>${fechaFormateada}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            <p id = 'totalCuenta'>Total Cuenta: $${cliente.totalCuenta ? cliente.totalCuenta.toFixed(2) : '0.00'}</p>
            <button id="btnCerrarCuenta">Cerrar</button>
        `;

        document.getElementById('btnCerrarCuenta').addEventListener('click', () => this.cerrarCuenta());

        if (cliente.totalCuenta > 1000) {
            Swal.fire({
                icon: 'warning',
                title: 'Atención',
                text: `La cuenta de ${cliente.nombre} es de $${cliente.totalCuenta.toFixed(2)}. Se recomienda contactar con el cliente para saldar la cuenta.\n\nEl teléfono de ${cliente.nombre} es ${cliente.telefono}.`,
            });
        }
    }


    mostrarTodosLosClientes() {
        const clientesUl = document.getElementById('clientes');
        clientesUl.innerHTML = '';

        this.clientes.forEach(cliente => {
            const li = document.createElement('li');
            li.textContent = `ID: ${cliente.id} - Nombre: ${cliente.nombre} - Teléfono: ${cliente.telefono}`;

            const verCuentaBtn = document.createElement('button');
            verCuentaBtn.textContent = 'Ver Cuenta';
            verCuentaBtn.id = 'verCuentaBtn';
            verCuentaBtn.addEventListener('click', () => this.verCuenta(cliente.id));
            li.appendChild(verCuentaBtn);

            const agregarCompraBtn = document.createElement('button');
            agregarCompraBtn.textContent = 'Agregar Compra';
            agregarCompraBtn.id = 'agregarCompraBtn';
            agregarCompraBtn.addEventListener('click', () => window.location.href = `agregar_compra.html?clienteId=${cliente.id}`);
            li.appendChild(agregarCompraBtn);

            const pagarCuentaBtn = document.createElement('button');
            pagarCuentaBtn.textContent = 'Pagar Cuenta';
            pagarCuentaBtn.id = 'pagarCuentaBtn';
            pagarCuentaBtn.addEventListener('click', () => window.location.href = `pagarCuenta.html?clienteId=${cliente.id}`);
            li.appendChild(pagarCuentaBtn);

            clientesUl.appendChild(li);
        });
    }

    cerrarCuenta() {
        const contenido = document.getElementById('contenido');
        contenido.innerHTML = '';
    }
}

const gestorClientes = new GestorClientes();

document.getElementById('verTodos').addEventListener('click', async () => {
    await gestorClientes.cargarClientes();
    gestorClientes.mostrarTodosLosClientes();
});

document.getElementById('verMenos').addEventListener('click', () => {
    const clientesUl = document.getElementById('clientes');
    clientesUl.innerHTML = '';
});

document.getElementById('btnBuscar').addEventListener('click', function () {
    const nombre = document.getElementById('busquedaNombre').value;
    gestorClientes.buscarClientes(nombre);
});

document.getElementById('btnBuscarId').addEventListener('click', function () {
    const id = document.getElementById('busquedaId').value;
    gestorClientes.buscarClientesId(id);
});