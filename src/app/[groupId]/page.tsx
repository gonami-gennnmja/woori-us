import SchedulerApp from "@/components/SchedulerApp";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  return <SchedulerApp groupId={groupId} />;
}
