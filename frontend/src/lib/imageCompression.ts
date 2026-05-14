const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export async function compressImage(file: File): Promise<File> {
  if (file.size <= MAX_FILE_SIZE) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    reader.onerror = (e) => {
      reject(e);
    };

    img.onload = async () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      let currentFile = file;
      const qualities = [0.95, 0.9, 0.85]; // 3 tries

      for (let i = 0; i < qualities.length; i++) {
        const quality = qualities[i];
        const scale = i === 0 ? 1 : i === 1 ? 0.95 : 0.9;
        
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const blob = await new Promise<Blob | null>((res) => {
          canvas.toBlob((b) => res(b), 'image/jpeg', quality);
        });
        
        if (!blob) continue;

        const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
        const newFile = new File([blob], newFileName, { type: 'image/jpeg' });
        
        // If first try makes it bigger, return original immediately
        if (i === 0 && newFile.size > file.size) {
          resolve(file);
          return;
        }

        currentFile = newFile;

        if (currentFile.size <= MAX_FILE_SIZE) {
          resolve(currentFile);
          return;
        }
      }

      // If after 3 tries still > 2MB, accept the last compressed version
      resolve(currentFile);
    };

    img.onerror = (e) => {
      reject(e);
    };

    reader.readAsDataURL(file);
  });
}
