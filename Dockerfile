
FROM node:20.13.1-alpine
#ENV LOG_LEVEL=3
#ENV MQTT_HOST=1.1.1.1
#ENV RINNAI_HOST=2.2.2.2
#ENV RINNAI_PORT=27847
WORKDIR /app
COPY ./dist/index.js .
CMD ["node", "index.js"]