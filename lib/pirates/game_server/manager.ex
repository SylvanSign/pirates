defmodule Pirates.GameServer.Manager do
    use GenServer
    alias Pirates.GameServer.Instance

    @name __MODULE__

  ##############
  # Client API #
  ##############

    def start_link do
        GenServer.start_link(@name, :ok, name: @name)
    end

    def get_available_server do
        GenServer.call(@name, :next)
    end

  ####################
  # Server Callbacks #
  ####################

  def init(:ok) do
      servers = []
      {:ok, servers}
  end

  def handle_call(:next, _from, servers) do
    #   todo: get next available server
    server = servers |>
        Enum.filter(fn (s) -> count(s) < 8 end) |>
        Enum.min_by(&count/1, fn -> create_server() end)
    {:reply, {:ok, server}, [server | servers]}
  end

  defp count(s) do
      Instance.count(Instance.table(s))
  end

  defp create_server do
      import Supervisor.Spec
    {:ok, server} = Supervisor.start_child(Pirates.GameServer.Supervisor, [])
    server
  end

end