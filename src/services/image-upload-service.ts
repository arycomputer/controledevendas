
// A função para converter um arquivo em uma string base64
const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error("Falha ao ler o arquivo como Data URL."));
      }
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

  try {
    const dataUrl = await toBase64(imageFile);
    // A API espera apenas os dados em base64, sem o prefixo do Data URL.
    const base64Image = dataUrl.split(',')[1];

    if (!base64Image) {
        throw new Error("Não foi possível extrair os dados em base64 da imagem.");
    }

    const body = new URLSearchParams({
        key: apiKey,
        image: base64Image,
        gallery: 'AppVendas'
    });
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString(),
    });

    const result = await response.json();

    if (!response.ok || result.status !== "success") {
      const apiErrorMessage = result?.error?.message || result?.error || "Resposta inesperada da API Postimages.";
      throw new Error(`Erro da API Postimages: ${apiErrorMessage}`);
    }

    if (result.data?.url) {
      return result.data.url;
    } else {
      throw new Error("A API Postimages não retornou um URL de imagem válido.");
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido durante o upload.";
    console.error("Erro no upload para o Postimages:", error);
    throw new Error(`Falha no upload: ${errorMessage}`);
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
  
  try {
    const formData = new FormData();
    formData.append("key", apiKey);
    formData.append("url", imageUrl);
    formData.append("gallery", "AppVendas");

    const response = await fetch(apiUrl, {
      method: "POST",
      body: formData,
    });
    
    const result = await response.json();

    if (!response.ok || result.status !== "success") {
       const apiErrorMessage = result?.error?.message || result?.error || "Resposta inesperada da API Postimages ao carregar a URL.";
      throw new Error(`Erro da API Postimages: ${apiErrorMessage}`);
    }

    if (result.data?.url) {
      return result.data.url;
    } else {
      throw new Error("A API Postimages não retornou um URL de imagem válido a partir do link.");
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido durante o upload.";
    console.error("Erro no upload do link para o Postimages:", error);
    throw new Error(`Falha no upload do link: ${errorMessage}`);
  }
}
