
![Plant Stake Labeler](./logo_banner.svg)

An on-demand, remote web interface designed to fetch plant lists from a Google Sheet and print plant stake labels using the [Label LIVE](https://label.live/) application. This setup enables quick and reliable label printing from any web-connected device (such as an iPad or smartphone in the greenhouse) directly to a local label printer.

---

## 🛠️ System Architecture

```mermaid
graph TD
    User([Gardener / User]) -->|1. Browses App| Frontend[Angular Web App]
    Frontend -->|2. Fetches Plant List| GoogleSheets[(Google Sheets API)]
    Frontend -->|3. Triggers HTTP POST /print| LabelLive[Label LIVE Local HTTP Server]
    LabelLive -->|4. Generates & Prints Label| LabelPrinter[Thermal / Stake Printer]
```

---

## 📋 Prerequisites

Ensure you have the following installed and set up before proceeding:

1. **Node.js**: Version 18.x or 20.x is recommended (compatible with Angular 17).
2. **Label LIVE**: Installed on the computer physically connected to your label printer.
3. **Google Cloud Console Account**: Needed to enable Google Sheets API and generate an API key.

---

## 🚀 Setup Instructions

### Step 1: Clone and Install Dependencies

Clone this repository to your local machine and run:

```bash
npm install
```

### Step 2: Set Up Google Sheets Data Source

This app pulls your plant inventory directly from a Google Sheet.

1. **Create the Google Sheet:**
   - Create a spreadsheet with at least two columns.
   - Name the worksheet exactly `Sheet1`.
   - Set row 1 as your headers (e.g. `Plant Name` in Column A, `URL` in Column B).
   - Populate rows 2+ with your plant data. Column A should contain the plant name, and Column B should contain the URL (used for the generated QR code or barcode).

2. **Obtain API Credentials:**
   - Go to the [Google Cloud Console](https://console.cloud.google.com/).
   - Create a new project (e.g. `plant-stake-labeler`).
   - Navigate to **APIs & Services > Library**, search for **Google Sheets API**, and click **Enable**.
   - Navigate to **APIs & Services > Credentials**, click **Create Credentials**, and select **API Key**. Copy this key.

3. **Get the Spreadsheet ID:**
   - Copy the spreadsheet ID from the URL of your Google Sheet:
     `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit`

4. **Configure the Environment:**
   - Create a file at `src/app/environment.ts` and populate it with your credentials:
     ```typescript
     export const environment = {
       spreadsheetId: 'YOUR_SPREADSHEET_ID_HERE',
       apiKey: 'YOUR_GOOGLE_API_KEY_HERE'
     };
     ```

### Step 3: Configure Label LIVE App Integration

Label LIVE acts as the local print server. The Angular application communicates with Label LIVE using its built-in HTTP server.

1. **Configure Label LIVE Local API Server:**
   - Open **Label LIVE**.
   - Go to **Settings** or the **Integrate** panel.
   - Enable the **HTTP/Web Server** or **Local API**.
   - By default, Label LIVE listens on port **`11180`**. Ensure the port matches your application configuration.

2. **Create Your Label Template:**
   - Design your plant stake label in Label LIVE.
   - Choose the dimensions corresponding to your plant stakes.
   - Add a Text element for the plant name and set its variable name to exactly **`PLANT_NAME`**.
   - Add a Barcode or QR Code element and set its variable name to exactly **`URL`**.
   - Save the design. Ensure the file name matches `DESIGN_NAME` in `app.config.ts`.
   
   > [!NOTE]
   > A starting template file [MC_Label.lsc](file:///Users/micha/Documents/GitHub/plant-stake-labeler/MC_Label.lsc) is included in the root of this repository. This is a Label LIVE template that we use for Mike's Carnivores, serving as a ready-to-use starting point.

3. **Align Application Settings:**
   - Open [src/app/app.config.ts](file:///home/michael/Documents/GitHub/plant-stake-labeler/src/app/app.config.ts) and verify the following variables:
     ```typescript
     // The filename (without extension) of your Label LIVE design template
     export const DESIGN_NAME = 'MC_Label';

     // The name of your physical printer as shown on your system
     export const PRINTER_ID = 'System-TSC TX310';

     // IP and port of the machine running Label LIVE (for LAN access)
     export const HOST_IP = '10.0.0.20';
     export const HOST_PORT = 11180;

     // Remote API URL used when accessing the app via a domain name
     export const REMOTE_API_URL = 'http://labellive.yourdomain.com/api/v1/';
     ```
     
     > [!TIP]
     > If you are running the Angular app on the same computer as Label LIVE, you can set `HOST_IP` to `'localhost'` or `'127.0.0.1'`.
     > If you are printing from other devices on the same local network (e.g., phone or tablet), set `HOST_IP` to the local LAN IP address (e.g., `192.168.1.X` or `10.0.0.X`) of the computer running Label LIVE.
     > When accessed via a domain name, the app automatically routes requests to `REMOTE_API_URL`.

---

## 💻 Running the Development Server

Start the local development server using:

```bash
npm start
```

Navigate to `http://localhost:4200/` in your web browser. You can search/filter plants fetched from Google Sheets, choose the number of copies, and hit **Print** to send a payload directly to the Label LIVE local HTTP server.

---
## 🏗️ Building & Web Server Deployment

To run the application on demand across your network (e.g., from an iPad or phone in the greenhouse), build the static app bundle and deploy it to a web server like **Nginx**.

> [!CAUTION]
> **Security Notice – Do NOT Open Router Ports!**
> There is **no built-in user authentication** in this application. **Do NOT use router port forwarding or expose this web app or port 11180 directly to the public internet by opening ports.** Exposing unauthenticated ports allows anyone on the internet to view your plant database and trigger unauthorized physical print jobs on your label printer.
> 
> For remote access outside your local network, always use a secure reverse proxy solution with authentication (such as a **Cloudflare Tunnel with Cloudflare Access / Zero Trust**) or a private encrypted mesh network (such as **Tailscale** or **WireGuard**).

### Step 1: Build the Application
Generate production build artifacts using:

```bash
npm run build
```

This compiles the project into production-optimized static HTML, JavaScript, and CSS assets under `dist/label-live-app/browser/`.

### Step 2: Move Build Artifacts to Web Server Root
Copy the contents of `dist/label-live-app/browser/` to your web server's document root directory (e.g. `/var/www/plant-stake-labeler`):

```bash
sudo mkdir -p /var/www/plant-stake-labeler
sudo cp -r dist/label-live-app/browser/* /var/www/plant-stake-labeler/
sudo chown -R www-data:www-data /var/www/plant-stake-labeler
```

### Step 3: Configure Nginx (Local LAN Access)
Create an Nginx configuration file (e.g. `/etc/nginx/sites-available/plant-stake-labeler`):

```nginx
server {
    listen 80;
    server_name plant-labeler.local; # Replace with your local server IP or hostname

    root /var/www/plant-stake-labeler;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Enable the configuration and reload Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/plant-stake-labeler /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 4: Secure Remote Access (Cloudflare Tunnel & Reverse Proxy)

To access the app securely over the internet without opening inbound router ports:

1. **Set Up Dual Endpoints in Cloudflare Tunnel (`cloudflared`) or Reverse Proxy:**
   - Install `cloudflared` on your host or configure your reverse proxy.
   - Configure **two public hostnames / endpoints**:
     - **Web App Hostname:** e.g., `labeler.yourdomain.com` pointing to your web server (`http://localhost:80`).
     - **Label LIVE API Hostname:** e.g., `labellive.yourdomain.com` pointing to the Label LIVE API server (`http://<LABEL_LIVE_IP>:11180` or `http://localhost:11180`).
   - The `cloudflared` daemon establishes outbound-only connections to Cloudflare—**requiring zero open inbound firewall/router ports**.

2. **Configure `REMOTE_API_URL`:**
   - Update `REMOTE_API_URL` in [src/app/app.config.ts](file:///home/michael/Documents/GitHub/plant-stake-labeler/src/app/app.config.ts) to match your reverse proxy domain:
     ```typescript
     export const REMOTE_API_URL = 'http://labellive.yourdomain.com/api/v1/';
     ```
   - When the Angular application is accessed via a domain name, it automatically uses `REMOTE_API_URL` instead of `HOST_IP:HOST_PORT`.

3. **Enforce Authentication (Cloudflare Access / Zero Trust):**
   - In the Cloudflare Zero Trust dashboard, wrap your application domain (e.g. `https://labeler.yourdomain.com`) in an **Access Application**.
   - Require user authentication (such as Email One-Time PIN, Google SSO, or GitHub login) so only authorized users can load the application.
   - If also protecting `labellive.yourdomain.com`, ensure CORS headers and authentication rules permit browser requests originating from your web app.

> [!IMPORTANT]
> **Network & Mixed Content Requirements:**
> - **Local LAN Access:** When accessed via local IP (`http://192.168.1.X`), the app submits print requests to `http://<HOST_IP>:11180`.
> - **Remote Domain Access:** When accessed via domain name, the app submits print requests to `REMOTE_API_URL` (`labellive.yourdomain.com`). Ensure both the web app and API endpoints use matching protocols (HTTP or HTTPS) to avoid **Mixed Content** browser errors.

---

## 🔧 Development and Commands

This project uses Angular CLI version 17.3.17.

### Development Server
Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`.

### Build
Run `ng build` (or `npm run build`) to build the project. The build artifacts will be saved in `dist/label-live-app/browser/`.

### Running Unit Tests
Run `ng test` to execute the unit tests via Karma.
