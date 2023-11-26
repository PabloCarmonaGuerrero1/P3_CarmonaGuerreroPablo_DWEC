// Selecciona elementos del DOM
const carrito = document.querySelector("#carrito");
const contenedorCarrito = document.querySelector("#lista-carrito tbody");
const vaciarCarritoBtn = document.querySelector("#vaciar-carrito");
const listaCursos = document.querySelector("#lista-cursos");
let articulosCarrito = [];

// Crea elementos para mostrar el total de productos y total de precios
const totalProductosElement = document.createElement("span");
totalProductosElement.id = "total-productos";
totalProductosElement.style.marginRight = "10px";

// Inserta el elemento totalProductosElement antes del botón vaciarCarritoBtn, si hay un elemento anterior, o al final
if (vaciarCarritoBtn.previousElementSibling) {
  vaciarCarritoBtn.parentNode.insertBefore(totalProductosElement, vaciarCarritoBtn);
} else {
  vaciarCarritoBtn.parentNode.appendChild(totalProductosElement);
}

// Crea elemento para mostrar el total de precios
const totalPreciosElement = document.createElement("span");
totalPreciosElement.id = "total-precios";

// Inserta el elemento totalPreciosElement antes del botón vaciarCarritoBtn, si hay un elemento anterior, o al final
if (vaciarCarritoBtn.previousElementSibling) {
  vaciarCarritoBtn.parentNode.insertBefore(totalPreciosElement, vaciarCarritoBtn);
} else {
  vaciarCarritoBtn.parentNode.appendChild(totalPreciosElement);
}

// Abre la conexión a IndexedDB
const request = indexedDB.open("carritoDB", 1);

// Configura la base de datos si es necesario
request.onupgradeneeded = function (event) {
  const db = event.target.result;
  if (!db.objectStoreNames.contains("carritoDB")) {
    db.createObjectStore("carrito", { keyPath: "id" });
  }
};

// Maneja errores en la apertura de la base de datos
request.onerror = function (event) {
  console.error("Error de IndexedDB:", event.target.errorCode);
};

// Maneja el éxito en la apertura de la base de datos
request.onsuccess = function (event) {
  db = event.target.result;
  cargarCarritoDesdeDB();
  cargarEventListeners();
};

// Agrega event listeners a elementos del DOM
function cargarEventListeners() {
  listaCursos.addEventListener("click", añadirCurso);
  carrito.addEventListener("click", eliminarCurso);
  vaciarCarritoBtn.addEventListener("click", () => {
    articulosCarrito = [];
    limpiarHTML();
    limpiarCarritoEnDB();
  });
  document.addEventListener("DOMContentLoaded", cargarCarritoDesdeDB);
}

// Maneja la adición de cursos al carrito
function añadirCurso(e) {
  e.preventDefault();
  if (e.target.classList.contains("agregar-carrito")) {
    const curso = e.target.parentElement.parentElement;
    leerDatosCurso(curso);
  }
}

// Maneja la eliminación de cursos del carrito
function eliminarCurso(e) {
  if (e.target.classList.contains("borrar-curso")) {
    const cursoId = e.target.getAttribute("data-id");
    articulosCarrito = articulosCarrito.filter((curso) => curso.id !== cursoId);
    carritoHTML(articulosCarrito);
    eliminarCursoEnDB(cursoId);
  }
}

// Lee los datos del curso seleccionado
function leerDatosCurso(curso) {
  const infoCurso = {
    imagen: curso.querySelector("img").src,
    titulo: curso.querySelector("h4").textContent,
    precio: curso.querySelector(".precio span").textContent,
    id: curso.querySelector("a").getAttribute("data-id"),
    cantidad: 1,
  };
  // Verifica si el curso ya está en el carrito
  const existe = articulosCarrito.some((curso) => curso.id === infoCurso.id);
  if (existe) {
    // Incrementa la cantidad si ya existe
    const cursos = articulosCarrito.map((curso) => {
      if (curso.id === infoCurso.id) {
        curso.cantidad++;
        return curso;
      } else {
        return curso;
      }
    });
    articulosCarrito = [...cursos];
  } else {
    // Agrega el curso al carrito si no existe
    articulosCarrito = [...articulosCarrito, infoCurso];
  }
  carritoHTML(articulosCarrito);
  guardarCursoEnDB(infoCurso);
}

// Actualiza la representación visual del carrito en HTML
function carritoHTML() {
  limpiarHTML();
  let totalProductos = 0;
  let totalPrecios = 0;
  articulosCarrito.forEach((curso) => {
    const { imagen, titulo, precio, cantidad, id } = curso;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <img src="${imagen}" width="100">
      </td>
      <td>${titulo}</td>
      <td>${precio}</td>
      <td>${cantidad}</td>
      <td>
        <button class="sumar-cantidad" data-id="${id}">+</button>
      </td>
      <td>
        <a href="#" class="borrar-curso" data-id="${id}">X</a>
      </td>
      <td>
        <button class="eliminar-cantidad" data-id="${id}">-</button>
      </td>
    `;
    contenedorCarrito.appendChild(row);

    totalProductos += cantidad;
    totalPrecios += parseFloat(precio) * cantidad;
  });
  totalProductosElement.textContent = `Total de productos: ${totalProductos}`;
  totalPreciosElement.textContent = `Total de precios: ${totalPrecios.toFixed(2)}`;

  // Agrega event listeners a los botones de suma y resta de cantidad
  const botonesSumarCantidad = document.querySelectorAll(".sumar-cantidad");
  botonesSumarCantidad.forEach((boton) => {
    const id = boton.getAttribute("data-id");
    boton.addEventListener("click", () => sumarCantidad(id));
  });
  const botonesEliminarCantidad = document.querySelectorAll(".eliminar-cantidad");
  botonesEliminarCantidad.forEach((boton) => {
    const id = boton.getAttribute("data-id");
    boton.addEventListener("click", () => eliminarCantidad(id));
  });
}

// Crea y configura un botón de ordenar y maneja su evento click
const botonOrdenar = document.createElement("button");
botonOrdenar.textContent = "Ordenar";
vaciarCarritoBtn.insertAdjacentElement("afterend", botonOrdenar);

let ordenAlfabeticamente = true;

botonOrdenar.addEventListener("click", function () {
  criterioActual = criterioActual === "titulo" ? "id" : "titulo";
  ordenarCarrito();
});

let criterioActual = "titulo";

// Ordena el carrito según el criterio actual y actualiza la representación visual
function ordenarCarrito() {
  if (criterioActual === "titulo") {
    articulosCarrito.sort((a, b) => a.titulo.localeCompare(b.titulo));
  } else if (criterioActual === "id") {
    articulosCarrito.sort((a, b) => a.id - b.id);
  }
  carritoHTML();
}

// Guarda el curso en la base de datos IndexedDB
function guardarCursoEnDB(curso) {
  const transaction = db.transaction(["carrito"], "readwrite");
  const objectStore = transaction.objectStore("carrito");
  const cursoDB = objectStore.get(curso.id);

  // Maneja el éxito al obtener el curso de la base de datos
  cursoDB.onsuccess = function (event) {
    const cursoSearch = event.target.result;
    if (cursoSearch) {
      // Incrementa la cantidad si ya existe
      cursoSearch.cantidad += 1;
      const updateRequest = objectStore.put(cursoSearch);

      // Maneja el éxito al actualizar la cantidad del curso
      updateRequest.onsuccess = function () {
        console.log("Cantidad del curso incrementada en IndexedDB");
      };

      // Maneja errores al actualizar la cantidad del curso
      updateRequest.onerror = function (event) {
        console.error("Error al actualizar la cantidad del curso en IndexedDB:", event.target.errorCode);
      };
    } else {
      // Agrega el curso si no existe
      const addRequest = objectStore.add(curso);

      // Maneja el éxito al agregar el curso
      addRequest.onsuccess = function (event) {
        console.log("Curso añadido a IndexedDB");
      };

      // Maneja errores al agregar el curso
      addRequest.onerror = function (event) {
        console.error("Error al añadir el curso a IndexedDB:", event.target.errorCode);
      };
    }
  };

  // Maneja errores al obtener el curso de la base de datos
  cursoDB.onerror = function (event) {
    console.error("Error al obtener el curso de IndexedDB:", event.target.errorCode);
  };
}

// Carga el carrito desde la base de datos al cargar la página
function cargarCarritoDesdeDB() {
  const transaction = db.transaction(["carrito"], "readonly");
  const objectStore = transaction.objectStore("carrito");
  const request = objectStore.getAll();

  // Maneja el éxito al obtener todos los cursos de la base de datos
  request.onsuccess = function (event) {
    articulosCarrito = event.target.result || [];
    carritoHTML(articulosCarrito);
    ordenarCarrito("titulo");
  };

  // Maneja errores al cargar el carrito desde la base de datos
  request.onerror = function (event) {
    console.error("Error al cargar el carrito desde IndexedDB:", event.target.errorCode);
  };
}

// Incrementa la cantidad de un curso en la base de datos
function sumarCantidad(e) {
  const transaction = db.transaction(["carrito"], "readwrite");
  const objectStore = transaction.objectStore("carrito");

  const getRequest = objectStore.get(e);

  // Maneja el éxito al obtener el curso de la base de datos
  getRequest.onsuccess = function (event) {
    const curso = event.target.result;

    if (curso) {
      // Incrementa la cantidad
      curso.cantidad += 1;

      const updateRequest = objectStore.put(curso);

      // Maneja el éxito al actualizar la cantidad del curso
      updateRequest.onsuccess = function () {
        cargarCarritoDesdeDB();
        console.log("Cantidad del curso incrementada en IndexedDB");
      };

      // Maneja errores al actualizar la cantidad del curso
      updateRequest.onerror = function (event) {
        console.error("Error al incrementar la cantidad del curso en IndexedDB:", event.target.errorCode);
      };
    }
  };

  // Maneja errores al obtener el curso de la base de datos
  getRequest.onerror = function (event) {
    console.error("Error al obtener el curso de IndexedDB:", event.target.errorCode);
  };
}

// Elimina un curso de la base de datos por su ID
function eliminarCursoEnDB(id) {
  const transaction = db.transaction(["carrito"], "readwrite");
  const objectStore = transaction.objectStore("carrito");

  const getRequest = objectStore.get(id);

  // Maneja el éxito al obtener el curso de la base de datos
  getRequest.onsuccess = function (event) {
    const curso = event.target.result;

    if (curso) {
      const deleteRequest = objectStore.delete(id);

      // Maneja el éxito al eliminar el curso de la base de datos
      deleteRequest.onsuccess = function () {
        console.log("Producto eliminado completamente de IndexedDB");
        cargarCarritoDesdeDB();
      };

      // Maneja errores al eliminar el curso de la base de datos
      deleteRequest.onerror = function (event) {
        console.error("Error al eliminar el producto de IndexedDB:", event.target.errorCode);
      };
    }
  };

  // Maneja errores al obtener el curso de la base de datos
  getRequest.onerror = function (event) {
    console.error("Error al obtener el producto de IndexedDB:", event.target.errorCode);
  };
}

// Reduce la cantidad de un curso en la base de datos
function eliminarCantidad(cursoId) {
  const transaction = db.transaction(["carrito"], "readwrite");
  const objectStore = transaction.objectStore("carrito");

  const getRequest = objectStore.get(cursoId);

  // Maneja el éxito al obtener el curso de la base de datos
  getRequest.onsuccess = function (event) {
    const curso = event.target.result;

    if (curso) {
      if (curso.cantidad > 1) {
        // Reduce la cantidad si es mayor a 1
        curso.cantidad -= 1;
        const updateRequest = objectStore.put(curso);

        // Maneja el éxito al actualizar la cantidad del curso
        updateRequest.onsuccess = function () {
          console.log("Cantidad del curso reducida en IndexedDB");
          cargarCarritoDesdeDB();
        };

        // Maneja errores al actualizar la cantidad del curso
        updateRequest.onerror = function (event) {
          console.error("Error al reducir la cantidad del curso en IndexedDB:", event.target.errorCode);
        };
      } else {
        // Elimina el curso si la cantidad es 1
        const deleteRequest = objectStore.delete(cursoId);

        // Maneja el éxito al eliminar el curso de la base de datos
        deleteRequest.onsuccess = function () {
          console.log("Curso eliminado de IndexedDB");
          cargarCarritoDesdeDB();
        };

        // Maneja errores al eliminar el curso de la base de datos
        deleteRequest.onerror = function (event) {
          console.error("Error al eliminar el curso de IndexedDB:", event.target.errorCode);
        };
      }
    }
  };

  // Maneja errores al obtener el curso de la base de datos
  getRequest.onerror = function (event) {
    console.error("Error al obtener el curso de IndexedDB:", event.target.errorCode);
  };
}

// Limpia el carrito en la base de datos
function limpiarCarritoEnDB() {
  // Inicia una transacción en la base de datos
  const transaction = db.transaction(["carrito"], "readwrite");
  const objectStore = transaction.objectStore("carrito");

  // Solicita borrar todos los registros en el objectStore "carrito"
  const request = objectStore.clear();

  // Maneja el evento de éxito al limpiar el carrito en IndexedDB
  request.onsuccess = function (event) {
    console.log("Carrito limpiado en IndexedDB");
  };

  // Maneja el evento de error en caso de problemas al limpiar el carrito en IndexedDB
  request.onerror = function (event) {
    console.error("Error al limpiar el carrito en IndexedDB:", event.target.errorCode);
  };
}

// Limpia el contenido visual del carrito en el DOM y actualiza los totales
function limpiarHTML() {
  // Elimina todos los elementos hijos del contenedor del carrito en el DOM
  while (contenedorCarrito.firstChild) {
    contenedorCarrito.firstChild.remove();
  } 

  // Actualiza los totales en el DOM
  totalProductosElement.textContent = 'Total de Productos : 0';
  totalPreciosElement.textContent = 'Total de Precios : 0';
}

// Agrega un evento al cargar el contenido del DOM para manejar la búsqueda de productos
document.addEventListener('DOMContentLoaded', function () {
  var formulario = document.getElementById('busqueda');
  var buscador = document.getElementById('buscador');

  formulario.addEventListener('submit', function (event) {
    // Evita el comportamiento por defecto del formulario al ser enviado
    event.preventDefault();

    // Convierte el texto de búsqueda a minúsculas para comparación sin distinción entre mayúsculas y minúsculas
    var busquedaTexto = buscador.value.toLowerCase();

    // Selecciona todos los títulos de cursos en el DOM
    var titulos = document.querySelectorAll('.info-card h4');

    // Busca el primer título que coincida con el texto de búsqueda
    var productoEncontrado = Array.from(titulos).find(function (titulo) {
      return titulo.textContent.toLowerCase() === busquedaTexto;
    });

    // Si se encuentra el producto, hace que la tarjeta se desplace a la vista suavemente
    if (productoEncontrado) {
      var tarjeta = productoEncontrado.closest('.card');
      if (tarjeta) {
        tarjeta.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // Si no se encuentra el producto, imprime un mensaje en la consola
      console.log('Producto no encontrado');
    }
  });
});
