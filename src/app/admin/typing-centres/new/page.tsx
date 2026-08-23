import { TypingCentreProvisionForm } from "./typing-centre-provision-form";

export default function NewTypingCentre() {
  return <><div className="admin-page-heading"><div><p>Provision tenant</p><h1>Add Typing Centre</h1><span>Create a confirmed owner account that can sign in with the supplied password.</span></div></div><TypingCentreProvisionForm /></>;
}
