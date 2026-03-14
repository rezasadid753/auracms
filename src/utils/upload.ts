export const uploadFileWithProgress = (
  url: string,
  formData: FormData,
  onProgress: (progress: number, estimatedTime: number) => void
) => {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<any>((resolve, reject) => {
    let startTime = Date.now();
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded * 100) / event.total);
        const timeElapsed = (Date.now() - startTime) / 1000;
        const uploadSpeed = event.loaded / timeElapsed;
        const remainingBytes = event.total - event.loaded;
        const estimatedTime = uploadSpeed > 0 ? remainingBytes / uploadSpeed : 0;
        onProgress(progress, estimatedTime);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (e) {
          resolve(xhr.responseText);
        }
      } else {
        try {
          reject(new Error(JSON.parse(xhr.responseText).error || 'Upload failed'));
        } catch (e) {
          reject(new Error(xhr.responseText || 'Upload failed'));
        }
      }
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.onabort = () => reject(new Error('Upload cancelled'));
    xhr.open('POST', url);
    xhr.send(formData);
  });
  return { promise, abort: () => xhr.abort() };
};
