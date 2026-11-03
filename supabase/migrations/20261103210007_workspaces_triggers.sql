-- Triggers: handle_updated_at
CREATE OR REPLACE FUNCTION public.handle_workspaces_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_workspaces_updated_at ON public.workspaces;
CREATE TRIGGER trigger_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_workspaces_updated_at();

DROP TRIGGER IF EXISTS trigger_workspace_links_updated_at ON public.workspace_links;
CREATE TRIGGER trigger_workspace_links_updated_at
  BEFORE UPDATE ON public.workspace_links
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_workspaces_updated_at();

DROP TRIGGER IF EXISTS trigger_workspace_credentials_updated_at ON public.workspace_credentials;
CREATE TRIGGER trigger_workspace_credentials_updated_at
  BEFORE UPDATE ON public.workspace_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_workspaces_updated_at();
