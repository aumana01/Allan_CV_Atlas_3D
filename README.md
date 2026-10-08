# Allan Umaña · Atlas Profesional 3D (corrección de renderizado)

Sitio web estático (HTML + CSS + JavaScript + **CesiumJS**) con globo terrestre 3D, cartografía satelital, vista de calles, marcadores interactivos, fichas, recorrido guiado y traducción español / inglés / italiano.

## Corrección del error `setDynamicLighting` (v2.1)

Esta versión corrige el mensaje **«An error occurred while rendering / TypeError: s.setDynamicLighting is not a function»** que aparecía al iniciar el globo. La causa era la opción incompatible `skyAtmosphere:true` en CesiumJS 1.134. Se eliminó para que Cesium cree su instancia normal de `SkyAtmosphere`. No hace falta token ni cambiar ajustes en Chrome para resolver **este** error.

Para instalar la corrección, extrae el ZIP **en una carpeta nueva** (para no mezclar versiones). Cierra el servidor anterior si sigue abierto y ejecuta `INICIAR_SITIO.bat`. Si el navegador mantiene en caché los archivos anteriores, presiona **Ctrl + Shift + R**.

**Validación:** se comprobaron sintaxis y lógica de inicialización y la integridad del ZIP. La descarga de CesiumJS y la representación real de las imágenes satelitales requieren una prueba con Internet desde tu computadora.

## Abrirlo localmente (Windows)

1. Extrae el ZIP en una carpeta, conservando su estructura.
2. Instala **Python 3** si todavía no está instalado.
3. Haz doble clic en `INICIAR_SITIO.bat`.
4. Se abrirá el navegador automáticamente en `http://127.0.0.1:8878/` (o 8879/8880 si el puerto está ocupado).
5. Para finalizar, cierra la ventana de consola o presiona Ctrl+C.

**Importante:** necesita Internet para cargar la biblioteca CesiumJS y la cartografía satelital. Habilita aceleración de hardware en Chrome / Edge. El sitio web en sí no requiere instalar paquetes Python, Node ni un servidor de pago. **No abras `index.html` directamente con doble clic**, pues el navegador puede bloquear la lectura local de JSON.

## Navegar

- Arrastrar globo: rotar / desplazarse; rueda: zoom; Ctrl + arrastrar: inclinar; clic en marcador: mostrar ficha.
- `Mundo`: vista mundial; `Costa Rica`: vista nacional; `Recorrido`: visita automática a proyectos seleccionados.
- `Satélite / Calles`: cambia imágenes; `+ / -`: controla acercamiento; `⛶`: pantalla completa; `N ↑`: orientar norte.
- El panel lateral permite buscar por nombre, localidad, entidad o tecnología y filtrar por país, tipo, año y tecnología.
- Al acercarse aparecen etiquetas, y los marcadores cercanos se agrupan.
- Interfaz en español / inglés / italiano. **Las traducciones de algunos registros del Excel siguen pendientes**; esos textos se presentan en español hasta ejecutar el servicio de traducción.

## Editar datos desde Excel

1. Abre `data/proyectos.xlsx`. La primera hoja contiene los campos editables.
2. Agrega proyectos en filas nuevas con un `id` único, nombre y descripción en español, empresa, país, latitud y longitud WGS84, fechas, categoría, rol, tecnologías, etc.
3. Para posiciones **aproximadas**, déjalo explícito en `precision` y `nota_geografica`. Para proyectos regionales, **no presentes la referencia territorial como sitio físico exacto**.
4. Ejecuta `ACTUALIZAR_DESDE_EXCEL.bat`, que utiliza las traducciones guardadas. Si añadiste textos sin traducir, instala Internet y ejecuta `ACTUALIZAR_CON_TRADUCCION.bat` (usa la librería externa `deep-translator` y requiere Internet).
5. Recarga la página con Ctrl+F5. El sitio consume `data/portafolio.json` generado desde el Excel.

**Campos especialmente útiles:** `id`, `tipo`, `nombre`, `organizacion`, `pais`, `ciudad`, `latitud`, `longitud`, `anio_inicio`, `anio_fin`, `rol`, `descripcion`, `participacion_detalle`, `precision`, `evidencia`, `imagen_url`, `url_fuente`, `url_google_maps`, `visible`.

**Advertencia sobre traducciones:** la información profesional y el catálogo se editan en español. El traductor Python procesa los textos nuevos y guarda traducciones en `data/traducciones_cache.json`. Sin conectividad o si la traducción falla, el generador mantiene el español: no inventa traducciones.

## Publicar gratis en GitHub Pages

1. Crea un repositorio público en GitHub (por ejemplo, `Allan_CV_Atlas`).
2. Sube **el contenido de esta carpeta** a la raíz del repositorio: `index.html`, `assets`, `js`, `data`, `scripts`, `.nojekyll`.
3. En **Settings → Pages**, selecciona **Deploy from a branch → main → / (root)** y guarda.
4. Espera a que GitHub publique el sitio. Las traducciones ya generadas y el JSON estarán incluidos, sin ejecutar Python en GitHub Pages.
5. Para actualizar: modifica Excel, corre el archivo `.bat` de actualización y sube `data/proyectos.xlsx`, `data/portafolio.json` y `data/traducciones_cache.json`.

## Arquitectura

- `index.html` navegación y secciones.
- `assets/styles.css` estilos y layout responsivo.
- `js/globe.js` visor CesiumJS, cartografía, zoom, vuelo 3D, marcadores y clustering.
- `js/config.js` token de Cesium ion **opcional** para relieve topográfico y edificios 3D (requiere cuenta y respetar términos).
- `js/app.js` interfaz, filtros, fichas, tour, eventos.
- `js/i18n.js` interfaz trilingüe.
- `data/proyectos.xlsx` **archivo maestro** (fuente en español).
- `data/portafolio.json` generado (consumido por el sitio).
- `scripts/publicar_excel.py` conversión Excel → JSON y traducción opcional en Python.
- `assets/CV_Allan_Umana_2026.pdf` CV descargable.

## Advertencias técnicas y legales

- El globo es **tridimensional** gracias al elipsoide WGS84 de CesiumJS. De manera predeterminada **no incluye elevaciones ni edificios 3D**. Opcionalmente, agrega un token público de Cesium ion con restricciones de dominio y permisos mínimos a `js/config.js` para activar **Cesium World Terrain**; configura `osmBuildings:true` si deseas mostrar edificios 3D (pueden generar consumo del servicio). La vista satelital sigue siendo imagen raster aplicada al globo.
- Las imágenes satelitales predeterminadas se solicitan al servicio público de **Esri World Imagery**, con atribución en pantalla; la disponibilidad, uso público y límites dependen de sus condiciones de servicio. La alternativa OpenStreetMap tiene sus propias políticas de uso; para tráfico considerable configura un proveedor de mapas autorizado.
- Se parte de 57 registros heredados (51 proyectos/iniciativas + 6 instituciones/empresas). La mayoría de coordenadas son **referencias aproximadas de municipio, región o ciudad**: verifica cada obra antes de presentarla públicamente como infraestructura localizada.
- **No es una copia de Google Earth** ni utiliza imágenes 3D propietarias de Google.
- Por privacidad, el sitio usa solo correo profesional y enlaces públicos; no publiques referencias personales ni coordenadas sensibles de sistemas de infraestructura sin autorización institucional.
- Probado con chequeos de sintaxis y flujo sin conectividad exterior. Es necesario realizar prueba visual en un navegador con Internet y WebGL para confirmar disponibilidad de imágenes y la experiencia Cesium real.
