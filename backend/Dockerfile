# ---- Build stage ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q dependency:go-offline
COPY src ./src
RUN mvn -q package -DskipTests

# ---- Runtime stage ----
FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app

# Run as a non-root, arbitrary-UID-friendly user (OpenShift compatible)
RUN useradd --system --uid 1001 --gid 0 appuser \
    && chown -R 1001:0 /app && chmod -R g=u /app
USER 1001

COPY --from=build --chown=1001:0 /app/target/*.jar app.jar

EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=45s --retries=5 \
  CMD ["java", "-version"]

ENTRYPOINT ["java", "-jar", "app.jar"]
