FROM gradle:8.10.2-jdk21 AS build
WORKDIR /app
COPY . .
RUN gradle installDist --no-daemon

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/build/install/antt-control-api ./
CMD ["bin/antt-control-api"]
