# Use AWS Lambda Node.js 18 base image
FROM public.ecr.aws/lambda/nodejs:18

# Install Chrome dependencies for Playwright on Amazon Linux 2
# Using yum package manager for the Node.js Lambda base image
RUN yum update -y && yum install -y \
    # Core X11 libraries
    libX11 \
    libXcomposite \
    libXdamage \
    libXext \
    libXfixes \
    libXrandr \
    libXrender \
    libXtst \
    libxkbcommon \
    # GTK and accessibility
    gtk3 \
    atk \
    at-spi2-atk \
    at-spi2-core \
    # Audio libraries
    alsa-lib \
    # NSS and security
    nss \
    nspr \
    # Graphics and rendering
    cairo \
    pango \
    mesa-libgbm \
    libdrm \
    # Cups for printing
    cups-libs \
    # Virtual display
    xorg-x11-server-Xvfb \
    # Font libraries
    fontconfig \
    freetype \
    # Additional essential libraries
    glib2 \
    dbus-libs \
    && yum clean all

# Set Playwright environment variables for Lambda
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=0
ENV DISPLAY=:99
ENV XVFB_WHD=1280x720x16

# Copy package files first for better caching
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including dev dependencies for TypeScript compilation)
RUN npm ci --no-audit --no-fund

# Install Playwright browsers with system dependencies
RUN npx playwright install chromium

# Copy source code
COPY src/ ./src/

# Compile TypeScript to JavaScript
RUN npm run build

# Set the CMD to your handler (now pointing to compiled JS)
CMD [ "dist/src/lambda/handler.handler" ]
