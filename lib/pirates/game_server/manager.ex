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

    def get_or_create_server(name) do
        GenServer.call(@name, {:get, name})
    end

  ####################
  # Server Callbacks #
  ####################

  def init(:ok) do
      servers = Map.new()
      {:ok, servers}
  end

  def handle_call(:next, _from, servers) do
    {name, instance} = 
        servers 
        |> Enum.filter(fn ({_, s}) -> count(s) < @max_players_per_server end) 
        |> Enum.min_by(fn ({_, s}) -> count(s) end, fn -> create_server() end)
    {:reply, {:ok, name}, Map.put(servers, name, instance)}
  end

  def handle_call({:get, name}, _from, servers) do
    if (Map.has_key?(servers, name)) do
         {:reply, Map.get(servers, name), servers}
    else
        {name, instance} = create_server()
        {:reply, instance, Map.put(servers, name, instance)}
    end
  end

  # handle dropped servers
  def handle_info({:DOWN, _ref, :process, server, _reason}, servers) do
      # todo: better structure than map?
      name = 
        servers
        |> Enum.find(fn ({_, s}) -> s == server end)
        |> elem(0)
    {:noreply, Map.delete(servers, name)}
  end

  defp count(server) do
      server |> Instance.table |> Instance.count
  end

  defp create_server do
    {:ok, server} = Supervisor.start_child(Pirates.GameServer.Factory, [])
    Process.monitor(server)
    {System.unique_integer([:positive]), server}
  end

end
