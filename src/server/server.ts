import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { DiagramData } from '../parser/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class Server {
  private app = express();
  private port = 3000;
  private diagramData: DiagramData;

  constructor(diagramData: DiagramData) {
    this.diagramData = diagramData;
    this.setupRoutes();
  }

  /**
   * Sets up the Express routes for the API and frontend
   */
  private setupRoutes(): void {
    // Serve static files from the frontend directory
    this.app.use(express.static(path.join(__dirname, '../frontend')));

    // API endpoint to get diagram data
    this.app.get('/api/diagram', (req, res) => {
      res.json(this.diagramData);
    });

    // Catch-all route to serve the frontend
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../frontend/index.html'));
    });
  }

  /**
   * Starts the Express server
   * @returns The URL where the server is running
   */
  public start(): string {
    this.app.listen(this.port, () => {
      console.log(`Server running at http://localhost:${this.port}`);
    });

    return `http://localhost:${this.port}`;
  }
}