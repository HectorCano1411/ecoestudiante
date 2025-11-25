# Iconos PWA

Este directorio debe contener los iconos de la aplicación para PWA.

## Tamaños Requeridos

- `icon-72x72.png` - 72x72 píxeles
- `icon-96x96.png` - 96x96 píxeles
- `icon-128x128.png` - 128x128 píxeles
- `icon-144x144.png` - 144x144 píxeles
- `icon-152x152.png` - 152x152 píxeles
- `icon-192x192.png` - 192x192 píxeles (mínimo requerido)
- `icon-384x384.png` - 384x384 píxeles
- `icon-512x512.png` - 512x512 píxeles (mínimo requerido)

## Cómo Generar los Iconos

### Opción 1: Herramientas Online

1. **RealFaviconGenerator**: https://realfavicongenerator.net/
   - Sube tu logo base (recomendado: 1024x1024px)
   - Genera todos los tamaños automáticamente
   - Descarga el paquete completo

2. **PWA Builder**: https://www.pwabuilder.com/imageGenerator
   - Similar a RealFaviconGenerator
   - Genera iconos optimizados para PWA

### Opción 2: Manual con ImageMagick

Si tienes un logo base `logo.png` (1024x1024px):

```bash
# Instalar ImageMagick (si no lo tienes)
# Ubuntu/Debian: sudo apt-get install imagemagick
# macOS: brew install imagemagick

# Generar todos los tamaños
convert logo.png -resize 72x72 icon-72x72.png
convert logo.png -resize 96x96 icon-96x96.png
convert logo.png -resize 128x128 icon-128x128.png
convert logo.png -resize 144x144 icon-144x144.png
convert logo.png -resize 152x152 icon-152x152.png
convert logo.png -resize 192x192 icon-192x192.png
convert logo.png -resize 384x384 icon-384x384.png
convert logo.png -resize 512x512 icon-512x512.png
```

### Opción 3: Usar un Logo Temporal

Mientras se crean los iconos finales, puedes usar un logo temporal o placeholder.

## Notas Importantes

- Los iconos deben ser **PNG** con fondo transparente o sólido
- El icono debe ser reconocible incluso en tamaños pequeños
- Usa colores que contrasten bien con fondos claros y oscuros
- El icono 192x192 y 512x512 son **obligatorios** para PWA

## Verificación

Después de agregar los iconos, verifica en:
- Chrome DevTools → Application → Manifest
- Lighthouse → PWA audit



