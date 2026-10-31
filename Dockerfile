# Pixel Beat is a static site (HTML, CSS and plain scripts), so a small web server is all it needs.
#
#   docker build -t pixel-beat .
#   docker run --rm -p 8080:80 pixel-beat
#
# then open http://localhost:8080
FROM nginx:alpine

COPY index.html style.css /usr/share/nginx/html/
COPY js/ /usr/share/nginx/html/js/

EXPOSE 80
