// A função para converter um arquivo em uma string base64
const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Remove o prefixo 'data:*/*;base64,'
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });

/**
 * Faz o upload de uma imagem para o serviço Postimages e retorna o URL.
 * Requer uma variável de ambiente `NEXT_PUBLIC_POSTIMAGES_API_KEY`.
 *
 * @param {File} imageFile - O arquivo de imagem para fazer o upload.
 * @returns {Promise<string>} Uma promessa que resolve para o URL da imagem carregada.
 * @throws {Error} Se a chave da API não estiver configurada ou se o upload falhar.
 */
export async function uploadImage(imageFile: File): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_POSTIMAGES_API_KEY;
  const apiUrl = "https://api.postimages.org/1/upload";

  if (!apiKey) {
    throw new Error("A variável de ambiente NEXT_PUBLIC_POSTIMAGES_API_KEY não está definida.");
  }

  const base64Image = await toBase64(imageFile);

  const formData = new FormData();
  formData.append("key", apiKey);
  formData.append("image", base64Image);
  
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (result.status === "success") {
      return result.data.url;
    } else {
      throw new Error(result.error?.message || "Ocorreu um erro desconhecido durante o upload da imagem.");
    }
  } catch (error) {
    console.error("Erro no upload para o Postimages:", error);
    throw error;
  }
}

/**
 * Faz o upload de uma imagem a partir de um URL para o serviço Postimages.
 *
 * @param {string} imageUrl - O URL da imagem para fazer o upload.
 * @returns {Promise<string>} Uma promessa que resolve para o novo URL da imagem no Postimages.
 * @throws {Error} Se a chave da API não estiver configurada ou se o upload falhar.
 */
export async function uploadImageFromUrl(imageUrl: string): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_POSTIMAGES_API_KEY;
  const apiUrl = "https://api.postimages.org/1/upload";

  if (!apiKey) {
    throw new Error("A variável de ambiente NEXT_PUBLIC_POSTIMAGES_API_KEY não está definida.");
  }
  
  const formData = new FormData();
  formData.append("key", apiKey);
  formData.append("url", imageUrl);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (result.status === "success") {
      return result.data.url;
    } else {
      throw new Error(result.error?.message || "Ocorreu um erro desconhecido durante o upload do link da imagem.");
    }
  } catch (error) {
    console.error("Erro no upload do link para o Postimages:", error);
    throw error;
  }
}
