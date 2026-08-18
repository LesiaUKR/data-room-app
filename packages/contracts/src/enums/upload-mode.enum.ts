// A taken name versions the existing document; suffixing it would hide that the two are related
const UploadMode = {
  NEW_FILE: 'NEW_FILE',
  NEW_VERSION: 'NEW_VERSION',
} as const;

type UploadMode = (typeof UploadMode)[keyof typeof UploadMode];

export { UploadMode };
