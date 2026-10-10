import { Svg, Path } from "@react-pdf/renderer";
import { styles } from "components/Resume/ResumePDF/styles";

/** Simple original geometric icons, licensed under the project's AGPLv3 grant. */
const EMAIL_PATH_D = "M48 96H464V416H48Z M80 128V160L256 272L432 160V128Z M80 200V384H432V200L256 312Z";
const PHONE_PATH_D = "M144 32H368V480H144Z M176 96V400H336V96Z M224 432H288V448H224Z";
const LOCATION_PATH_D = "M256 16L464 224L256 496L48 224Z M256 80L104 228L256 432L408 228Z";
const URL_PATH_D = "M64 160H192V192H96V416H320V320H352V448H64Z M224 64H448V288H416V120L232 304L208 280L392 96H224Z";
const GITHUB_PATH_D = URL_PATH_D;
const LINKEDIN_PATH_D = URL_PATH_D;
const TYPE_TO_PATH_D = {
  email: EMAIL_PATH_D,
  phone: PHONE_PATH_D,
  location: LOCATION_PATH_D,
  url: URL_PATH_D,
  url_github: GITHUB_PATH_D,
  url_linkedin: LINKEDIN_PATH_D,
} as const;

export type IconType =
  | "email"
  | "phone"
  | "location"
  | "url"
  | "url_github"
  | "url_linkedin";

export const ResumePDFIcon = ({
  type,
  isPDF,
}: {
  type: IconType;
  isPDF: boolean;
}) => {
  const pathD = TYPE_TO_PATH_D[type];
  if (isPDF) {
    return <PDFIcon pathD={pathD} />;
  }
  return <SVGIcon pathD={pathD} />;
};

const { width, height, fill } = styles.icon;

const PDFIcon = ({ pathD }: { pathD: string }) => (
  <Svg viewBox="0 0 512 512" style={{ width, height }}>
    <Path d={pathD} fill={fill} fillRule="evenodd" />
  </Svg>
);

const SVGIcon = ({ pathD }: { pathD: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
    style={{ width, height, fill }}
  >
    <path d={pathD} fillRule="evenodd" />
  </svg>
);
