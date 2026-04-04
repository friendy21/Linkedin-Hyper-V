FROM mcr.microsoft.com/playwright:v1.52.0-jammy

WORKDIR /app

# Install real Google Chrome Stable (NOT Chromium — LinkedIn detects it)
RUN apt-get update && apt-get install -y wget gnupg \
  && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" \
     >> /etc/apt/sources.list.d/google.list \
  && apt-get update && apt-get install -y google-chrome-stable \
  && rm -rf /var/lib/apt/lists/*

# Xvfb for virtual display (headed mode without a real screen)
RUN apt-get update && apt-get install -y xvfb x11vnc novnc websockify \
  && rm -rf /var/lib/apt/lists/*

# Install Node.js dependencies
COPY package.json ./
RUN npm install

# Copy prisma schema
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source and build
COPY . .
RUN npm run build

# Create profiles directory
RUN mkdir -p /app/profiles

EXPOSE 3001

ENV CHROME_PATH=/usr/bin/google-chrome
ENV DISPLAY=:99

CMD ["npm", "start"]
