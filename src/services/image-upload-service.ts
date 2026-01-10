require('dotenv').config();

// A função para converter um arquivo em uma string base64
const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        // Remove the Data URL prefix (e.g., "data:image/png;base64,")
        const base64Data = result.split(',')[1];
        if (base64Data) {
            resolve(base64Data);
        } else {
            reject(new Error("Não foi possível extrair os dados em base64 do arquivo."));
        }
      } else {
        reject(new Error("Falha ao ler o arquivo como Data URL."));
      }
    };
    reader.onerror = (error) => reject(error);
  });

/**
 * Faz o upload de uma imagem para o serviço ImgBB e retorna o URL.
 * Requer uma variável de ambiente `NEXT_PUBLIC_IMGBB_API_KEY`.
 *
 * @param {File} imageFile - O arquivo de imagem para fazer o upload.
 * @returns {Promise<string>} Uma promessa que resolve para o URL da imagem carregada.
 * @throws {Error} Se a chave da API não estiver configurada ou se o upload falhar.
 */
export async function uploadImage(imageFile: File): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
  const apiUrl = "https://api.imgbb.com/1/upload";

  if (!apiKey) {
    throw new Error("A variável de ambiente NEXT_PUBLIC_IMGBB_API_KEY não está definida.");
  }

  try {
    const base64Image = await toBase64(imageFile);

    const formData = new FormData();
    formData.append("key", apiKey);
    formData.append("image", base64Image);
    formData.append("name", imageFile.name);

    const response = await fetch(apiUrl, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error('ImgBB API Error Response:', result);
      const apiErrorMessage = result?.error?.message || "Resposta inesperada da API ImgBB.";
      throw new Error(`Erro da API ImgBB: ${apiErrorMessage}`);
    }

    if (result.data?.url) {
      return result.data.url;
    } else {
      throw new Error("A API ImgBB não retornou um URL de imagem válido.");
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido durante o upload.";
    console.error("Erro no upload para o ImgBB:", error);
    throw new Error(`Falha no upload: ${errorMessage}`);
  }
}

/**
 * Faz o upload de uma imagem a partir de um URL para o serviço ImgBB.
 *
 * @param {string} imageUrl - O URL da imagem para fazer o upload.
 * @returns {Promise<string>} Uma promessa que resolve para o novo URL da imagem no ImgBB.
 * @throws {Error} Se a chave da API não estiver configurada ou se o upload falhar.
 */
export async function uploadImageFromUrl(imageUrl: string): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
  const apiUrl = `https://api.imgbb.com/1/upload?key=${apiKey}&image=${encodeURIComponent(imageUrl)}`;
  
  if (!apiKey) {
    throw new Error("A variável de ambiente NEXT_PUBLIC_IMGBB_API_KEY não está definida.");
  }
  
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
    });
    
    const result = await response.json();

    if (!response.ok || !result.success) {
       console.error('ImgBB API Error Response (from URL):', result);
       const apiErrorMessage = result?.error?.message || "Resposta inesperada da API ImgBB ao carregar a URL.";
      throw new Error(`Erro da API ImgBB: ${apiErrorMessage}`);
    }

    if (result.data?.url) {
      return result.data.url;
    } else {
      throw new Error("A API ImgBB não retornou um URL de imagem válido a partir do link.");
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido durante o upload do link.";
    console.error("Erro no upload do link para o ImgBB:", error);
    throw new Error(`Falha no upload do link: ${errorMessage}`);
  }
}