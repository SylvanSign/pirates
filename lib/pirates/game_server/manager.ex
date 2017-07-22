defmodule Pirates.GameServer.Manager do
    @moduledoc """
    Routes to game server instances and cleans up after them
    """

    use GenServer
    alias Pirates.GameServer.Instance

    @name __MODULE__
    @max_players_per_server 2

  ##############
  # Client API #
  ##############

    def start_link do
        GenServer.start_link(@name, :ok, name: @name)
    end

    def next_available_server do
        GenServer.call(@name, :next)
    end

  ####################
  # Server Callbacks #
  ####################

  def init(:ok) do
      servers = MapSet.new()
      {:ok, servers}
  end

  def handle_call(:next, _from, servers) do
    server = 
        servers 
        |> Enum.filter(fn (s) -> count(s) < @max_players_per_server end) 
        |> Enum.min_by(&count/1, fn -> create_server() end)
    {:reply, {:ok, server}, MapSet.put(servers, server)}
  end

  # handle dropped servers
  def handle_info({:DOWN, _ref, :process, server, _reason}, servers) do
    {:noreply, MapSet.delete(servers, server)}
  end

  defp count(server) do
      server |> Instance.table |> Instance.count
  end

  defp create_server do
    {:ok, server} = Supervisor.start_child(Pirates.GameServer.Factory, [])
    Process.monitor(server)
    server
  end


end
