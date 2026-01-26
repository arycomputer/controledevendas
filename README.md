# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Running Locally

To run this project on your local machine, follow these steps:

1.  **Install Dependencies**:
    Open your terminal in the project's root directory and run the following command to install all the necessary packages:
    ```bash
    npm install
    ```

2.  **Set Up Environment Variables**:
    This project uses the ImgBB service to handle image uploads. You'll need an API key from them.
    
    *   Create a new file named `.env.local` in the root of your project.
    *   Go to [https://api.imgbb.com/](https://api.imgbb.com/) to get your free API key.
    *   Add the following line to your `.env.local` file, replacing `YOUR_IMGBB_API_KEY` with the key you obtained:
    
    ```
    NEXT_PUBLIC_IMGBB_API_KEY=YOUR_IMGBB_API_KEY
    ```

3.  **Run the Development Server**:
    Once the dependencies are installed and the environment variable is set, you can start the development server:
    ```bash
    npm run dev
    ```

4.  **Open the Application**:
    Open your web browser and navigate to [http://localhost:9002](http://localhost:9002) to see your application running.
