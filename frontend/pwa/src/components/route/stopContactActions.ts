export const openMaps = (address: string) => {
  window.location.href = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
};

export const callPhone = (phone: string) => {
  window.location.href = `tel:${phone.replace(/\s+/g, '')}`;
};
