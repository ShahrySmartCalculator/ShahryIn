// components//activation.ts
export const isOfficeExpired = (createdAt: string | null): boolean => {
    if (!createdAt) return true;
    const days = (new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return days > 30;
  };
  