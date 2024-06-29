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

            clientesUl.appendChild(li);
        });
    }

    verCuenta(clienteId) {
        const cliente = this.clientes.find(c => c.id === clienteId);
        if (!cliente) {
            console.error('Cliente no encontrado');
            return;
        }
    
        const contenido = document.getElementById('contenido');
        contenido.innerHTML = `
            <h2>Compras de ${cliente.nombre}</h2>
            <ul>
                ${cliente.compras.map(compra => {
                    const producto = compra.producto;
                    const precio = producto.precio ? producto.precio.toFixed(2) : '0.00';
                    const fechaFormateada = compra.fecha.toDateString();
                    return `
                        <li>
                            Producto: ${producto.nombre} - 
                            Precio: $${precio} - 
                            Cantidad: ${compra.cantidad} -
                            Fecha: ${fechaFormateada}
                        </li>
                    `;
                }).join('')}
            </ul>
            <p>Total Cuenta: $${cliente.totalCuenta ? cliente.totalCuenta.toFixed(2) : '0.00'}</p>
            <label for="montoPago">Monto a pagar:</label>
            <input type="number" id="montoPago" name="montoPago">
            <button id="btnPagarCuenta">Pagar Cuenta</button>
            <button id="btnCerrarCuenta">Cerrar</button>
        `;
    
        document.getElementById('btnPagarCuenta').addEventListener('click', () => this.solicitarPago(cliente.id));
        document.getElementById('btnCerrarCuenta').addEventListener('click', () => this.cerrarCuenta());
    
        if (cliente.totalCuenta > 1000) {
            Swal.fire({
                icon: 'warning',
                title: 'Atención',
                text: `La cuenta de ${cliente.nombre} es de $${cliente.totalCuenta.toFixed(2)}. Se recomienda contactar con el cliente para saldar la cuenta.\n\nEl teléfono de ${cliente.nombre} es ${cliente.telefono}.`,
            });
        }
    }

    async solicitarPago(clienteId) {
        const clienteDocRef = doc(db, 'clientes', clienteId.toString());
    
        try {
        
            await runTransaction(db, async (transaction) => {
                const clienteSnap = await transaction.get(clienteDocRef);
    
                if (!clienteSnap.exists()) {
                    throw new Error('El cliente no existe en Firestore');
                }
    
                const clienteData = clienteSnap.data();
    
            
                const result = await Swal.fire({
                    title: 'Ingrese el código de cajero',
                    input: 'password',
                    inputAttributes: {
                        autocapitalize: 'off',
                        autocorrect: 'off'
                    },
                    showCancelButton: true,
                    confirmButtonText: 'Pagar',
                    showLoaderOnConfirm: true,
                    preConfirm: async (codigo) => {
                        const codigoCajeroCorrecto = '1234';
                        if (codigo !== codigoCajeroCorrecto) {
                            Swal.showValidationMessage('Código de cajero incorrecto');
                        } else {
                            const montoPago = parseFloat(document.getElementById('montoPago').value);
                            if (isNaN(montoPago) || montoPago <= 0) {
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Error',
                                    text: 'Ingrese un monto válido para pagar la cuenta',
                                });
                            } else {
                            
                                const nuevoTotalCuenta = clienteData.totalCuenta - montoPago;
                                const fechaPago = new Date().toISOString();
    
                                transaction.update(clienteDocRef, {
                                    totalCuenta: nuevoTotalCuenta,
                                    fechaUltimoPago: fechaPago
                                });
    
                                return { montoPago, fechaPago };
                            }
                        }
                    },
                    allowOutsideClick: () => !Swal.isLoading()
                });
    
            
                if (result.isConfirmed) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Éxito',
                        text: 'Cuenta pagada correctamente.',
                    }).then(() => {
                        this.verCuenta(clienteId);
                    });
                }
            });
        } catch (error) {
            console.error('Error al actualizar la cuenta:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo actualizar la cuenta',
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
