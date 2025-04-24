FROM node:18-alpine

# Install flash-install globally
RUN npm install -g flash-install

# Create app directory
WORKDIR /app

# Copy package.json and lockfile
COPY package.json package-lock.json ./

# Install dependencies using flash-install
RUN flash-install --no-dev

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
